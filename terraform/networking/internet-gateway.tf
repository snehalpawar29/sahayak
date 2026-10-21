resource "aws_internet_gateway" "sahayak" {
  vpc_id = aws_vpc.sahayak.id

  tags = {
    Name = "sahayak-prod-igw"
  }
}
