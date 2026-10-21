variable "aws_region" {
  description = "AWS region for Sahayak production networking"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the Sahayak production VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones" {
  description = "Availability Zones for the network"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}
