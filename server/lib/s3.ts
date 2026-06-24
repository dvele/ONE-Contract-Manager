import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

// Region and credentials resolve via the default AWS chain:
// an IAM task role on AWS, or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY / a
// profile locally. Only the bucket name is read explicitly.
const REGION = process.env.AWS_REGION || "us-west-1";
const TEMPLATE_PREFIX = "templates/";

const s3 = new S3Client({ region: REGION });

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error(
      "AWS_S3_BUCKET must be set to store contract templates in S3."
    );
  }
  return bucket;
}

export interface TemplateObject {
  fileName: string;
  size: number;
  lastModified: Date | undefined;
}

/** Upload a template .docx to s3://<bucket>/templates/<fileName>. */
export async function uploadTemplate(
  fileName: string,
  buffer: Buffer
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: `${TEMPLATE_PREFIX}${fileName}`,
      Body: buffer,
      ContentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
  );
}

/** List all template objects, stripping the templates/ prefix from each key. */
export async function listTemplates(): Promise<TemplateObject[]> {
  const bucket = getBucket();
  const templates: TemplateObject[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const result: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: TEMPLATE_PREFIX,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of result.Contents ?? []) {
      const key = obj.Key ?? "";
      const fileName = key.slice(TEMPLATE_PREFIX.length);
      // Skip the prefix "folder" placeholder and non-.docx keys.
      if (!fileName || !fileName.endsWith(".docx") || fileName.startsWith("~$")) {
        continue;
      }
      templates.push({
        fileName,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified,
      });
    }

    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return templates;
}

/** Delete a template by file name (no prefix). */
export async function deleteTemplate(fileName: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: `${TEMPLATE_PREFIX}${fileName}`,
    })
  );
}

/** Return true if a template with the given file name exists in S3. */
export async function templateExists(fileName: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: getBucket(),
        Key: `${TEMPLATE_PREFIX}${fileName}`,
      })
    );
    return true;
  } catch (err: any) {
    if (
      err?.name === "NotFound" ||
      err?.$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw err;
  }
}
