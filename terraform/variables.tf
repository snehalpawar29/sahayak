variable "aws_region" {
  description = "AWS region for Sahayak"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "sahayak"
}

variable "vpc_cidr" {
  description = "CIDR range for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs; use two AZs for EB compatibility"
  type        = list(string)
  default     = ["10.20.1.0/24", "10.20.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs reserved for future use"
  type        = list(string)
  default     = ["10.20.11.0/24", "10.20.12.0/24"]
}

variable "application_name" {
  description = "Elastic Beanstalk application name"
  type        = string
  default     = "sahayak"
}

variable "environment_name" {
  description = "Elastic Beanstalk environment name"
  type        = string
  default     = "sahayak-dev"
}

variable "instance_type" {
  description = "EC2 instance type for the demo environment"
  type        = string
  default     = "t3.micro"
}

variable "backend_image" {
  description = "Full URI of an existing backend image including tag"
  type        = string
}

variable "frontend_image" {
  description = "Full URI of an existing frontend image including tag"
  type        = string
}

variable "database_url_parameter_name" {
  description = "SSM parameter name containing the production or demo database URL"
  type        = string
  default     = "/sahayak/prod/DATABASE_URL"
}

variable "jwt_secret_parameter_name" {
  description = "SSM parameter name containing the JWT secret"
  type        = string
  default     = "/sahayak/prod/JWT_SECRET"
}

variable "frontend_url" {
  description = "Public URL used by the backend for CORS; update after deployment"
  type        = string
  default     = "*"
}