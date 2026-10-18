data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "deployment" {
  bucket = "${var.project_name}-${var.environment}-eb-artifacts-${data.aws_caller_identity.current.account_id}"

  force_destroy = false

  tags = {
    Name = "${var.project_name}-${var.environment}-eb-artifacts"
  }
}

resource "aws_s3_bucket_public_access_block" "deployment" {
  bucket                  = aws_s3_bucket.deployment.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "deployment" {
  bucket = aws_s3_bucket.deployment.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

data "archive_file" "application" {
  type        = "zip"
  source_dir  = "${path.module}/../deployment/elastic-beanstalk"
  output_path = "${path.module}/sahayak-deployment.zip"
}

resource "aws_s3_object" "application" {
  bucket = aws_s3_bucket.deployment.id
  key    = "sahayak/${data.archive_file.application.output_sha}.zip"
  source = data.archive_file.application.output_path

  source_hash = data.archive_file.application.output_sha
}

resource "aws_elastic_beanstalk_application" "main" {
  name        = var.application_name
  description = "Sahayak emergency resource finder"

  appversion_lifecycle {
    service_role          = aws_iam_role.service_role.arn
    max_count             = 5
    delete_source_from_s3 = false
  }
}

data "aws_elastic_beanstalk_solution_stack" "docker" {
  most_recent = true
  name_regex  = "64bit Amazon Linux 2023 v.* running Docker"
}

resource "aws_elastic_beanstalk_application_version" "main" {
  name        = "sahayak-${data.archive_file.application.output_sha}"
  application = aws_elastic_beanstalk_application.main.name
  bucket      = aws_s3_bucket.deployment.id
  key         = aws_s3_object.application.key
}

resource "aws_elastic_beanstalk_environment" "main" {
  name                = var.environment_name
  application         = aws_elastic_beanstalk_application.main.name
  solution_stack_name = data.aws_elastic_beanstalk_solution_stack.docker.name
  version_label       = aws_elastic_beanstalk_application_version.main.name

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "SingleInstance"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = aws_iam_role.service_role.name
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.instance_type
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = aws_vpc.main.id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", aws_subnet.public[*].id)
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "AssociatePublicIpAddress"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = aws_iam_role.service_role.name
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "BACKEND_IMAGE"
    value     = var.backend_image
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "FRONTEND_IMAGE"
    value     = var.frontend_image
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "FRONTEND_URL"
    value     = var.frontend_url
  }

  depends_on = [
    aws_iam_role_policy_attachment.eb_service_managed,
    aws_iam_role_policy_attachment.eb_ec2_managed,
    aws_iam_role_policy.sahayak_ssm_read
  ]

  tags = {
    Name = var.environment_name
  }
}