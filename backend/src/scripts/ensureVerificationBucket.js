import { S3Client, HeadBucketCommand, CreateBucketCommand, PutPublicAccessBlockCommand, PutBucketEncryptionCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "us-east-1";
const bucket = process.env.S3_VERIFICATION_BUCKET;

if (!bucket) {
  console.error("S3_VERIFICATION_BUCKET is required.");
  process.exit(1);
}

const s3 = new S3Client({ region });

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`S3 bucket already exists: ${bucket}`);
  } catch (error) {
    const status = error.$metadata?.httpStatusCode;

    if (status !== 404 && error.name !== "NotFound") {
      throw error;
    }

    const params = { Bucket: bucket };

    if (region !== "us-east-1") {
      params.CreateBucketConfiguration = {
        LocationConstraint: region,
      };
    }

    await s3.send(new CreateBucketCommand(params));
    console.log(`Created S3 bucket: ${bucket}`);
  }

  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    })
  );

  await s3.send(
    new PutBucketEncryptionCommand({
      Bucket: bucket,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          },
        ],
      },
    })
  );

  console.log("S3 public-access block and encryption configured.");
}

ensureBucket()
  .catch((error) => {
    console.error("S3 initialization failed:", error.name, error.message);
    process.exitCode = 1;
  })
  .finally(() => s3.destroy());
