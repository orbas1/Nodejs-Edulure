variable "project" {
  type        = string
  description = "Project name used in resource naming and tagging."
}

variable "environment" {
  type        = string
  description = "Environment identifier (dev)."
  default     = "dev"
}

variable "region" {
  type        = string
  description = "AWS region to deploy resources into."
  default     = "us-east-1"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC."
  default     = "10.10.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets."
  default     = [
    "10.10.0.0/20",
    "10.10.16.0/20"
  ]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets."
  default     = [
    "10.10.32.0/20",
    "10.10.48.0/20"
  ]
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones to spread resources across."
  default     = ["us-east-1a", "us-east-1b"]
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
  default     = 1
}

variable "max_count" {
  type        = number
  description = "Maximum ECS tasks."
  default     = 2
}

variable "cpu" {
  type        = number
  description = "CPU units for tasks."
  default     = 512
}

variable "memory" {
  type        = number
  description = "Memory (MiB) for tasks."
  default     = 1024
}

variable "cpu_target_utilization" {
  type        = number
  description = "CPU target for autoscaling."
  default     = 45
}

variable "memory_target_utilization" {
  type        = number
  description = "Memory target for autoscaling."
  default     = 60
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
  default     = "X86_64"
}

variable "healthcheck_path" {
  type        = string
  description = "Health check path for ALB and container."
  default     = "/health"
}

variable "healthcheck_interval" {
  type        = number
  description = "Interval in seconds for ALB health checks."
  default     = 30
}

variable "enable_alb_deletion_protection" {
  type        = bool
  description = "Enable ALB deletion protection."
  default     = false
}

variable "assign_public_ip" {
  type        = bool
  description = "Assign public IPs to ECS tasks (set true only when NAT is disabled)."
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
  default     = "db.t4g.medium"
}

variable "database_allocated_storage" {
  type        = number
  description = "Initial Postgres storage in GB."
  default     = 50
}

variable "database_max_allocated_storage" {
  type        = number
  description = "Max Postgres storage in GB."
  default     = 200
}

variable "database_backup_retention_days" {
  type        = number
  description = "Backup retention period in days."
  default     = 3
}

variable "database_apply_immediately" {
  type        = bool
  description = "Apply DB changes immediately."
  default     = true
}

variable "database_skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on destroy."
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Additional tags applied to resources."
  default     = {
    Owner = "platform-team"
  }
}
