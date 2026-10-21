resource "aws_eip" "nat_1a" {
  domain = "vpc"

  tags = {
    Name = "sahayak-nat-eip-1a"
  }

  depends_on = [aws_internet_gateway.sahayak]
}

resource "aws_eip" "nat_1b" {
  domain = "vpc"

  tags = {
    Name = "sahayak-nat-eip-1b"
  }

  depends_on = [aws_internet_gateway.sahayak]
}
