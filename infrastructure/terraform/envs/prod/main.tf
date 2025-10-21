terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = var.region
  default_tags {
    tags = merge({
      Environment = var.environment
      Project     = var.project
      ManagedBy   = "terraform"
    }, var.tags)
  }
}

module "networking" {
  source                = "../../modules/networking"
  project               = var.project
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  availability_zones    = var.availability_zones
  create_nat_gateway    = var.create_nat_gateway
  enable_flow_logs      = var.enable_vpc_flow_logs
  flow_logs_retention_in_days = var.vpc_flow_logs_retention_days
  flow_logs_traffic_type      = var.vpc_flow_logs_traffic_type
  flow_logs_log_group_kms_key_arn = var.vpc_flow_logs_kms_key_arn
  tags                  = var.tags
}

resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.environment}-alb"
  description = "Expose HTTPS to the load balancer"
  vpc_id      = module.networking.vpc_id

  ingress {
    description      = "Allow HTTP"
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    description      = "Allow HTTPS"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

module "backend" {
  source                           = "../../modules/backend_service"
  project                          = var.project
  environment                      = var.environment
  region                           = var.region
  vpc_id                           = module.networking.vpc_id
  public_subnet_ids                = module.networking.public_subnet_ids
  private_subnet_ids               = module.networking.private_subnet_ids
  load_balancer_security_group_id  = aws_security_group.alb.id
  container_image                  = var.container_image
  container_port                   = var.container_port
  desired_count                    = var.desired_count
  max_count                        = var.max_count
  environment_variables            = var.environment_variables
  secret_environment_variables     = var.secret_environment_variables
  secret_arns                      = [for secret in var.secret_environment_variables : secret.arn]
  cpu                              = var.cpu
  memory                           = var.memory
  cpu_target_utilization           = var.cpu_target_utilization
  memory_target_utilization        = var.memory_target_utilization
  healthcheck_path                 = var.healthcheck_path
  healthcheck_interval             = var.healthcheck_interval
  enable_alb_deletion_protection   = var.enable_alb_deletion_protection
  cpu_architecture                 = var.cpu_architecture
  assign_public_ip                 = var.assign_public_ip
  certificate_arn                  = var.certificate_arn
  https_listener_port              = var.https_listener_port
  https_ssl_policy                 = var.https_ssl_policy
  load_balancer_idle_timeout       = var.load_balancer_idle_timeout
  enable_alb_access_logs           = var.enable_alb_access_logs
  alb_access_logs_bucket           = var.alb_access_logs_bucket
  alb_access_logs_prefix           = var.alb_access_logs_prefix
  waf_web_acl_arn                  = var.waf_web_acl_arn
  enable_deployment_circuit_breaker = var.enable_deployment_circuit_breaker
  rollback_on_failure              = var.rollback_on_failure
  tags                             = var.tags
}

module "postgres" {
  source                     = "../../modules/postgres"
  project                    = var.project
  environment                = var.environment
  vpc_id                     = module.networking.vpc_id
  subnet_ids                 = module.networking.private_subnet_ids
  allowed_security_group_ids = [module.backend.security_group_id]
  master_username            = var.database_username
  master_password            = var.database_password
  allocated_storage          = var.database_allocated_storage
  max_allocated_storage      = var.database_max_allocated_storage
  backup_retention_period    = var.database_backup_retention_days
  apply_immediately          = var.database_apply_immediately
  skip_final_snapshot        = var.database_skip_final_snapshot
  engine_version             = var.database_engine_version
  instance_class             = var.database_instance_class
  kms_key_id                 = var.database_kms_key_id
  deletion_protection        = var.database_deletion_protection
  storage_type               = var.database_storage_type
  performance_insights_retention_period = var.database_performance_insights_retention
  monitoring_interval        = var.database_monitoring_interval
  parameters                 = var.database_parameters
  backup_window              = var.database_backup_window
  maintenance_window         = var.database_maintenance_window
  cloudwatch_logs_exports    = var.database_cloudwatch_logs_exports
  auto_minor_version_upgrade = var.database_auto_minor_version_upgrade
  tags                       = var.tags
}

resource "aws_ssm_parameter" "database_endpoint" {
  name  = "/${var.project}/${var.environment}/database/endpoint"
  type  = "String"
  value = module.postgres.endpoint
  tags  = var.tags
}

resource "aws_ssm_parameter" "database_port" {
  name  = "/${var.project}/${var.environment}/database/port"
  type  = "String"
  value = tostring(module.postgres.port)
  tags  = var.tags
}

output "vpc_id" {
  value       = module.networking.vpc_id
  description = "Identifier of the VPC provisioned for the environment."
}

output "load_balancer_dns" {
  value       = module.backend.load_balancer_dns
  description = "DNS name for the Application Load Balancer serving the API."
}

output "database_endpoint" {
  value       = module.postgres.endpoint
  description = "Connection endpoint for the managed Postgres instance."
}
