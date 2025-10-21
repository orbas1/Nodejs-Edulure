terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30"
    }
  }
}

locals {
  parameter_family = tonumber(replace(var.engine_version, ".", "")) >= 150 ? "postgres15" : "postgres14"
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

resource "aws_db_parameter_group" "this" {
  name        = "${var.project}-${var.environment}-postgres"
  family      = local.parameter_family
  description = "Baseline PostgreSQL parameters for ${var.project} ${var.environment}"

  dynamic "parameter" {
    for_each = var.parameters
    content {
      name         = parameter.value.name
      value        = parameter.value.value
      apply_method = parameter.value.apply_method
    }
  }
}

resource "aws_iam_role" "monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0
  name  = "${var.project}-${var.environment}-postgres-monitoring"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "monitoring" {
  count      = var.monitoring_interval > 0 ? 1 : 0
  role       = aws_iam_role.monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
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
  parameter_group_name    = aws_db_parameter_group.this.name
  skip_final_snapshot     = var.skip_final_snapshot
  backup_retention_period = var.backup_retention_period
  publicly_accessible     = false
  storage_encrypted       = true
  apply_immediately       = var.apply_immediately
  kms_key_id                     = var.kms_key_id
  storage_type                   = var.storage_type
  deletion_protection            = var.deletion_protection
  copy_tags_to_snapshot          = true
  performance_insights_enabled   = true
  performance_insights_retention_period = var.performance_insights_retention_period
  auto_minor_version_upgrade     = var.auto_minor_version_upgrade
  iam_database_authentication_enabled = true
  monitoring_interval            = var.monitoring_interval
  monitoring_role_arn            = var.monitoring_interval > 0 ? aws_iam_role.monitoring[0].arn : null
  preferred_backup_window        = var.backup_window
  maintenance_window             = var.maintenance_window
  enabled_cloudwatch_logs_exports = var.cloudwatch_logs_exports

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
