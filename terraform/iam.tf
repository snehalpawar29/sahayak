

# EC2 role assumed by Elastic Beanstalk instances
resource "aws_iam_role" "eb_ec2_role" {
  name = "aws-elasticbeanstalk-ec2-role"
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Preserve the four existing AWS-managed policy attachments
locals {
  eb_ec2_managed_policy_arns = toset([
    "arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker",
    "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier",
    "arn:aws:iam::aws:policy/AWSElasticBeanstalkWorkerTier",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ])
}

resource "aws_iam_role_policy_attachment" "eb_ec2_managed" {
  for_each = local.eb_ec2_managed_policy_arns

  role       = aws_iam_role.eb_ec2_role.name
  policy_arn = each.value
}

# Read only the five existing Sahayak SSM parameters
resource "aws_iam_role_policy" "sahayak_ssm_read" {
  name = "SahayakSSMParameterReadPolicy"
  role = aws_iam_role.eb_ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadSahayakProductionParameters"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/sahayak/prod/DATABASE_URL",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/sahayak/prod/JWT_SECRET",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/sahayak/prod/FRONTEND_URL",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/sahayak/prod/PORT",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/sahayak/prod/JWT_EXPIRES_IN"
        ]
      }
    ]
  })
}

# Instance profile supplied to Elastic Beanstalk EC2 instances
resource "aws_iam_instance_profile" "eb_ec2_profile" {
  name = "aws-elasticbeanstalk-ec2-role"
  path = "/"

  role = aws_iam_role.eb_ec2_role.name

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}


# Elastic Beanstalk service role
resource "aws_iam_role" "service_role" {
  name = "aws-elasticbeanstalk-service-role"
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "elasticbeanstalk.amazonaws.com"
        }

        Action = "sts:AssumeRole"

        Condition = {
          StringEquals = {
            "sts:ExternalId" = "elasticbeanstalk"
          }
        }
      }
    ]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# AWS-managed policies attached to the Elastic Beanstalk service role
locals {
  eb_service_managed_policy_arns = toset([
    "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth",
    "arn:aws:iam::aws:policy/AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy"
  ])
}

resource "aws_iam_role_policy_attachment" "eb_service_managed" {
  for_each = local.eb_service_managed_policy_arns

  role       = aws_iam_role.service_role.name
  policy_arn = each.value
}

output "eb_service_role_arn" {
  value = aws_iam_role.service_role.arn
}

output "eb_ec2_role_arn" {
  value = aws_iam_role.eb_ec2_role.arn
}

output "eb_ec2_instance_profile_name" {
  value = aws_iam_instance_profile.eb_ec2_profile.name
}
