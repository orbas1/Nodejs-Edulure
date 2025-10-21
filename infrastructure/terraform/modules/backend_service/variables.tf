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

variable "certificate_arn" {
  type        = string
  description = "ACM certificate ARN enabling HTTPS on the load balancer."
  default     = null
}

variable "https_listener_port" {
  type        = number
  description = "Port to expose HTTPS traffic on when a certificate ARN is supplied."
  default     = 443
}

variable "https_ssl_policy" {
  type        = string
  description = "SSL policy applied to the HTTPS listener."
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "assign_public_ip" {
  type        = bool
  description = "Assign a public IP to ECS tasks (only for environments without NAT)."
  default     = false
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

variable "load_balancer_idle_timeout" {
  type        = number
  description = "Idle timeout in seconds for the Application Load Balancer."
  default     = 60
}

variable "enable_alb_access_logs" {
  type        = bool
  description = "Enable ALB access logs to the specified S3 bucket."
  default     = false
}

variable "alb_access_logs_bucket" {
  type        = string
  description = "S3 bucket name that stores ALB access logs."
  default     = null
  validation {
    condition     = var.enable_alb_access_logs ? (var.alb_access_logs_bucket != null && trimspace(var.alb_access_logs_bucket) != "") : true
    error_message = "Specify alb_access_logs_bucket when enable_alb_access_logs is true."
  }
}

variable "alb_access_logs_prefix" {
  type        = string
  description = "S3 prefix for ALB access logs."
  default     = null
}

variable "waf_web_acl_arn" {
  type        = string
  description = "Optional WAFv2 Web ACL ARN to associate with the load balancer."
  default     = null
}

variable "enable_deployment_circuit_breaker" {
  type        = bool
  description = "Toggle ECS deployment circuit breaker for automatic rollbacks."
  default     = true
}

variable "rollback_on_failure" {
  type        = bool
  description = "Whether the deployment circuit breaker should trigger rollbacks."
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags."
  default     = {}
}
