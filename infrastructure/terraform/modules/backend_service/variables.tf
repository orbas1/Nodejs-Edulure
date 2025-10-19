variable "project" {
  type        = string
  description = "Project name used in resource identifiers."
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)."
}

variable "region" {
  type        = string
  description = "AWS region for the deployment."
}

variable "vpc_id" {
  type        = string
  description = "VPC hosting the ECS service."
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnets for the Application Load Balancer."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnets for ECS tasks."
}

variable "load_balancer_security_group_id" {
  type        = string
  description = "Security group that allows inbound traffic to the ALB."
}

variable "container_image" {
  type        = string
  description = "Container image for the backend API."
}

variable "container_port" {
  type        = number
  description = "Container port the API listens on."
  default     = 8080
}

variable "cpu" {
  type        = number
  description = "CPU units allocated to the task definition."
  default     = 1024
}

variable "memory" {
  type        = number
  description = "Memory in MiB allocated to the task definition."
  default     = 2048
}

variable "desired_count" {
  type        = number
  description = "Desired number of running tasks."
  default     = 2
}

variable "max_count" {
  type        = number
  description = "Maximum number of running tasks."
  default     = 6
}

variable "cpu_target_utilization" {
  type        = number
  description = "CPU utilization target for scaling."
  default     = 55
}

variable "memory_target_utilization" {
  type        = number
  description = "Memory utilization target for scaling."
  default     = 65
}

variable "environment_variables" {
  type        = map(string)
  description = "Non-sensitive environment variables injected into the container."
  default     = {}
}

variable "secret_environment_variables" {
  type = list(object({
    name = string
    arn  = string
  }))
  description = "Sensitive environment variables sourced from Secrets Manager or SSM."
  default     = []
}

variable "secret_arns" {
  type        = list(string)
  description = "Secrets that the task role can read."
  default     = []
}

variable "healthcheck_path" {
  type        = string
  description = "Path used by load balancer and container health checks."
  default     = "/health"
}

variable "healthcheck_interval" {
  type        = number
  description = "Interval in seconds for ALB health checks."
  default     = 30
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days."
  default     = 30
}

variable "cpu_architecture" {
  type        = string
  description = "CPU architecture for the task (e.g., X86_64, ARM64)."
  default     = "X86_64"
}

variable "enable_alb_deletion_protection" {
  type        = bool
  description = "Whether to enable deletion protection on the ALB."
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Resource tags."
  default     = {}
}
