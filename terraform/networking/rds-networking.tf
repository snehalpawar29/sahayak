resource "aws_db_subnet_group" "sahayak" {
  name        = "sahayak-prod-db-subnets"
  description = "Private database subnets for Sahayak production"

  subnet_ids = [
    aws_subnet.sahayak["db_private_1a"].id,
    aws_subnet.sahayak["db_private_1b"].id
  ]

  tags = {
    Name = "sahayak-prod-db-subnets"
  }
}
