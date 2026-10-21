resource "aws_route_table" "public" {
  vpc_id = aws_vpc.sahayak.id

  tags = {
    Name = "sahayak-public-rt"
  }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.sahayak.id
}

resource "aws_route_table_association" "public_1a" {
  subnet_id      = aws_subnet.sahayak["public_1a"].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_1b" {
  subnet_id      = aws_subnet.sahayak["public_1b"].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "app_private_1a" {
  vpc_id = aws_vpc.sahayak.id

  tags = {
    Name = "sahayak-app-private-1a-rt"
  }
}

resource "aws_route" "app_private_1a_nat" {
  route_table_id         = aws_route_table.app_private_1a.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat_1a.id
}

resource "aws_route_table_association" "app_private_1a" {
  subnet_id      = aws_subnet.sahayak["app_private_1a"].id
  route_table_id = aws_route_table.app_private_1a.id
}

resource "aws_route_table" "app_private_1b" {
  vpc_id = aws_vpc.sahayak.id

  tags = {
    Name = "sahayak-app-private-1b-rt"
  }
}

resource "aws_route" "app_private_1b_nat" {
  route_table_id         = aws_route_table.app_private_1b.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat_1b.id
}

resource "aws_route_table_association" "app_private_1b" {
  subnet_id      = aws_subnet.sahayak["app_private_1b"].id
  route_table_id = aws_route_table.app_private_1b.id
}

resource "aws_route_table" "db_private" {
  vpc_id = aws_vpc.sahayak.id

  tags = {
    Name = "sahayak-db-private-rt"
  }
}

resource "aws_route_table_association" "db_private_1a" {
  subnet_id      = aws_subnet.sahayak["db_private_1a"].id
  route_table_id = aws_route_table.db_private.id
}

resource "aws_route_table_association" "db_private_1b" {
  subnet_id      = aws_subnet.sahayak["db_private_1b"].id
  route_table_id = aws_route_table.db_private.id
}
