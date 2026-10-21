output "vpc_id" {
  description = "Sahayak production VPC ID"
  value       = aws_vpc.sahayak.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value = {
    us_east_1a = aws_subnet.sahayak["public_1a"].id
    us_east_1b = aws_subnet.sahayak["public_1b"].id
  }
}

output "app_private_subnet_ids" {
  description = "Private application subnet IDs"
  value = {
    us_east_1a = aws_subnet.sahayak["app_private_1a"].id
    us_east_1b = aws_subnet.sahayak["app_private_1b"].id
  }
}

output "db_private_subnet_ids" {
  description = "Private database subnet IDs"
  value = {
    us_east_1a = aws_subnet.sahayak["db_private_1a"].id
    us_east_1b = aws_subnet.sahayak["db_private_1b"].id
  }
}

output "internet_gateway_id" {
  description = "Internet Gateway ID"
  value       = aws_internet_gateway.sahayak.id
}

output "nat_gateway_ids" {
  description = "NAT Gateway IDs"
  value = {
    us_east_1a = aws_nat_gateway.nat_1a.id
    us_east_1b = aws_nat_gateway.nat_1b.id
  }
}

output "nat_public_ips" {
  description = "Public IP addresses assigned to NAT Gateways"
  value = {
    us_east_1a = aws_eip.nat_1a.public_ip
    us_east_1b = aws_eip.nat_1b.public_ip
  }
}

output "security_group_ids" {
  description = "Security group IDs"
  value = {
    alb = aws_security_group.alb.id
    app = aws_security_group.app.id
    rds = aws_security_group.rds.id
  }
}

output "rds_subnet_group_name" {
  description = "RDS subnet group name"
  value       = aws_db_subnet_group.sahayak.name
}
