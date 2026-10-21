resource "aws_security_group" "alb" {
  name        = "sahayak-alb-sg"
  description = "Allow HTTPS traffic to the Sahayak load balancer"
  vpc_id      = aws_vpc.sahayak.id

  ingress {
    description = "HTTPS from the internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sahayak-alb-sg"
  }
}

resource "aws_security_group" "app" {
  name        = "sahayak-app-sg"
  description = "Allow application traffic from the ALB"
  vpc_id      = aws_vpc.sahayak.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Application port from ALB"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sahayak-app-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "sahayak-rds-sg"
  description = "Allow PostgreSQL traffic from the application"
  vpc_id      = aws_vpc.sahayak.id

  ingress {
    description     = "PostgreSQL from application"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "Outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sahayak-rds-sg"
  }
}
