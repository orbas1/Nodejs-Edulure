terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30"
    }
  }
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-${var.environment}-postgres"
  subnet_ids = var.subnet_ids
  tags = merge(
    {
      Name = "${var.project}-${var.environment}-postgres"
    },
    var.tags,
  )
}

resource "aws_security_group" "this" {
  name        = "${var.project}-${var.environment}-postgres"
  description = "Allow postgres access from application tier"
  vpc_id      = var.vpc_id

  ingress {
    description      = "Application access"
    from_port        = var.port
    to_port          = var.port
    protocol         = "tcp"
    security_groups  = var.allowed_security_group_ids
    cidr_blocks      = var.allowed_cidr_blocks
    ipv6_cidr_blocks = var.allowed_ipv6_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    {
      Name = "${var.project}-${var.environment}-postgres"
    },
    var.tags,
  )
}

resource "aws_db_instance" "this" {
  identifier              = "${var.project}-${var.environment}-postgres"
  engine                  = "postgres"
  engine_version          = var.engine_version
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  max_allocated_storage   = var.max_allocated_storage
  username                = var.master_username
  password                = var.master_password
  db_subnet_group_name    = aws_db_subnet_group.this.name
  vpc_security_group_ids  = [aws_security_group.this.id]
  skip_final_snapshot     = var.skip_final_snapshot
  backup_retention_period = var.backup_retention_period
  publicly_accessible     = false
  storage_encrypted       = true
  apply_immediately       = var.apply_immediately
  performance_insights_enabled = true
  auto_minor_version_upgrade   = true
  iam_database_authentication_enabled = true

  tags = merge(
    {
      Name = "${var.project}-${var.environment}-postgres"
    },
    var.tags,
  )
}

output "endpoint" {
  value = aws_db_instance.this.endpoint
}

output "port" {
  value = aws_db_instance.this.port
}

output "security_group_id" {
  value = aws_security_group.this.id
}
