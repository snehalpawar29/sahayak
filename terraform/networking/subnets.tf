locals {
  subnets = {
    public_1a = {
      name                = "sahayak-public-1a"
      cidr                = "10.20.1.0/24"
      availability_zone   = "us-east-1a"
      public_ip_on_launch = true
      tier                = "public"
    }
    public_1b = {
      name                = "sahayak-public-1b"
      cidr                = "10.20.2.0/24"
      availability_zone   = "us-east-1b"
      public_ip_on_launch = true
      tier                = "public"
    }
    app_private_1a = {
      name                = "sahayak-app-private-1a"
      cidr                = "10.20.11.0/24"
      availability_zone   = "us-east-1a"
      public_ip_on_launch = false
      tier                = "app-private"
    }
    app_private_1b = {
      name                = "sahayak-app-private-1b"
      cidr                = "10.20.12.0/24"
      availability_zone   = "us-east-1b"
      public_ip_on_launch = false
      tier                = "app-private"
    }
    db_private_1a = {
      name                = "sahayak-db-private-1a"
      cidr                = "10.20.21.0/24"
      availability_zone   = "us-east-1a"
      public_ip_on_launch = false
      tier                = "db-private"
    }
    db_private_1b = {
      name                = "sahayak-db-private-1b"
      cidr                = "10.20.22.0/24"
      availability_zone   = "us-east-1b"
      public_ip_on_launch = false
      tier                = "db-private"
    }
  }
}

resource "aws_subnet" "sahayak" {
  for_each = local.subnets

  vpc_id                  = aws_vpc.sahayak.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.availability_zone
  map_public_ip_on_launch = each.value.public_ip_on_launch

  tags = {
    Name = each.value.name
    Tier = each.value.tier
  }
}
