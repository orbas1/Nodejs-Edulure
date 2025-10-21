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

variable "assign_public_ip" {
  type        = bool
  description = "Assign public IPs to ECS tasks (should remain false when NAT gateways are provisioned)."
  default     = false
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

variable "tags" {
  type        = map(string)
  description = "Additional tags applied to resources."
  default     = {
    Owner          = "platform-team"
    ComplianceTier = "soak"
  }
}
