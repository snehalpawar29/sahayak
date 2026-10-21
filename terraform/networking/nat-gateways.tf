resource "aws_nat_gateway" "nat_1a" {
  allocation_id = aws_eip.nat_1a.id
  subnet_id     = aws_subnet.sahayak["public_1a"].id

  tags = {
    Name = "sahayak-nat-1a"
  }

  depends_on = [aws_internet_gateway.sahayak]
}

resource "aws_nat_gateway" "nat_1b" {
  allocation_id = aws_eip.nat_1b.id
  subnet_id     = aws_subnet.sahayak["public_1b"].id

  tags = {
    Name = "sahayak-nat-1b"
  }

  depends_on = [aws_internet_gateway.sahayak]
}
