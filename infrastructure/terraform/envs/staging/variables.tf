variable "project" {
  type        = string
  description = "Project name used in resource naming and tagging."
}

variable "environment" {
  type        = string
  description = "Environment identifier (staging)."
  default     = "staging"
}

variable "region" {
  type        = string
  description = "AWS region to deploy resources into."
  default     = "us-east-2"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC."
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets."
  default     = [
    "10.20.0.0/20",
    "10.20.16.0/20",
    "10.20.32.0/20"
  ]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets."
  default     = [
    "10.20.48.0/20",
    "10.20.64.0/20",
    "10.20.80.0/20"
  ]
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones to spread resources across."
  default     = ["us-east-2a", "us-east-2b", "us-east-2c"]
}

variable "create_nat_gateway" {
  type        = bool
  description = "Provision a NAT gateway for private subnets."
  default     = true
}

variable "enable_vpc_flow_logs" {
  type        = bool
  description = "Enable VPC flow logs for observability."
  default     = true
}

variable "vpc_flow_logs_retention_days" {
  type        = number
  description = "Retention period for VPC flow logs."
  default     = 30
}

variable "vpc_flow_logs_traffic_type" {
  type        = string
  description = "Traffic type captured by flow logs."
  default     = "ALL"
}

variable "vpc_flow_logs_kms_key_arn" {
  type        = string
  description = "Optional KMS key for encrypting flow log groups."
  default     = null
}

variable "container_image" {
  type        = string
  description = "Docker image for the backend API."
}

variable "container_port" {
  type        = number
  description = "Port the container exposes."
  default     = 8080
}

variable "desired_count" {
  type        = number
  description = "Desired ECS tasks."
  default     = 2
}

variable "max_count" {
  type        = number
  description = "Maximum ECS tasks."
  default     = 4
}

variable "cpu" {
  type        = number
  description = "CPU units for tasks."
  default     = 1024
}

variable "memory" {
  type        = number
  description = "Memory (MiB) for tasks."
  default     = 2048
}

variable "cpu_target_utilization" {
  type        = number
  description = "CPU target for autoscaling."
  default     = 50
}

variable "memory_target_utilization" {
  type        = number
  description = "Memory target for autoscaling."
  default     = 65
}

variable "environment_variables" {
  type        = map(string)
  description = "Plain environment variables exposed to the API container."
  default     = {}
}

variable "secret_environment_variables" {
  type = list(object({
    name = string
    arn  = string
  }))
  description = "Sensitive environment variables accessible to the API container."
  default     = []
}

variable "cpu_architecture" {
  type        = string
  description = "CPU architecture for ECS tasks."
  default     = "ARM64"
}

variable "healthcheck_path" {
  type        = string
  description = "Health check path for ALB and container."
  default     = "/health"
}

variable "healthcheck_interval" {
  type        = number
  description = "Interval in seconds for ALB health checks."
  default     = 20
}

variable "enable_alb_deletion_protection" {
  type        = bool
  description = "Enable ALB deletion protection."
  default     = true
}

variable "load_balancer_idle_timeout" {
  type        = number
  description = "Idle timeout for the ALB in seconds."
  default     = 60
}

variable "enable_alb_access_logs" {
  type        = bool
  description = "Emit ALB access logs to S3."
  default     = false
}

variable "alb_access_logs_bucket" {
  type        = string
  description = "S3 bucket for ALB access logs."
  default     = null
}

variable "alb_access_logs_prefix" {
  type        = string
  description = "S3 prefix for ALB access logs."
  default     = null
}

variable "waf_web_acl_arn" {
  type        = string
  description = "Optional WAF Web ACL ARN."
  default     = null
}

variable "enable_deployment_circuit_breaker" {
  type        = bool
  description = "Toggle ECS deployment circuit breaker."
  default     = true
}

variable "rollback_on_failure" {
  type        = bool
  description = "Rollback failed ECS deployments automatically."
  default     = true
}

variable "assign_public_ip" {
  type        = bool
  description = "Assign public IPs to ECS tasks (should remain false when NAT gateways are provisioned)."
  default     = false
}

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN to enable HTTPS on the ALB."
  default     = null
}

variable "https_listener_port" {
  type        = number
  description = "Port exposed for HTTPS when a certificate ARN is supplied."
  default     = 443
}

variable "https_ssl_policy" {
  type        = string
  description = "SSL policy applied to the HTTPS listener."
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "database_username" {
  type        = string
  description = "Master username for Postgres."
}

variable "database_password" {
  type        = string
  description = "Master password for Postgres."
  sensitive   = true
}

variable "database_engine_version" {
  type        = string
  description = "Postgres engine version."
  default     = "15.4"
}

variable "database_instance_class" {
  type        = string
  description = "Instance class for Postgres."
  default     = "db.m6g.large"
}

variable "database_allocated_storage" {
  type        = number
  description = "Initial Postgres storage in GB."
  default     = 150
}

variable "database_max_allocated_storage" {
  type        = number
  description = "Max Postgres storage in GB."
  default     = 512
}

variable "database_backup_retention_days" {
  type        = number
  description = "Backup retention period in days."
  default     = 7
}

variable "database_apply_immediately" {
  type        = bool
  description = "Apply DB changes immediately."
  default     = false
}

variable "database_skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on destroy."
  default     = false
}

variable "database_kms_key_id" {
  type        = string
  description = "Customer managed KMS key for database encryption."
  default     = null
}

variable "database_deletion_protection" {
  type        = bool
  description = "Prevent destruction of the database instance."
  default     = true
}

variable "database_storage_type" {
  type        = string
  description = "Storage type for Postgres."
  default     = "gp3"
}

variable "database_performance_insights_retention" {
  type        = number
  description = "Performance Insights retention in days."
  default     = 7
}

variable "database_monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds (0 disables)."
  default     = 30
}

variable "database_parameters" {
  type = list(object({
    name         = string
    value        = string
    apply_method = string
  }))
  description = "Additional Postgres parameter overrides."
  default = [
    {
      name         = "log_min_duration_statement"
      value        = "1000"
      apply_method = "pending-reboot"
    },
    {
      name         = "shared_preload_libraries"
      value        = "pg_stat_statements"
      apply_method = "pending-reboot"
    },
    {
      name         = "pg_stat_statements.max"
      value        = "20000"
      apply_method = "pending-reboot"
    }
  ]
}

variable "database_backup_window" {
  type        = string
  description = "Preferred backup window for Postgres."
  default     = "04:00-05:00"
}

variable "database_maintenance_window" {
  type        = string
  description = "Preferred maintenance window for Postgres."
  default     = "sun:05:00-sun:06:00"
}

variable "database_cloudwatch_logs_exports" {
  type        = list(string)
  description = "RDS logs exported to CloudWatch Logs."
  default     = ["postgresql", "upgrade"]
}

variable "database_auto_minor_version_upgrade" {
  type        = bool
  description = "Apply Postgres minor upgrades automatically."
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Additional tags applied to resources."
  default     = {
    Owner          = "platform-team"
    ComplianceTier = "soak"
  }
}
