provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Sahayak"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}
