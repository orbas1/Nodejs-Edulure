variable "project" {
  description = "Project name used for tagging and resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets."
  type        = list(string)
  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "Provide at least two public subnets across availability zones."
  }
}

variable "private_subnet_cidrs" {
  description = "List of CIDR blocks for private subnets."
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "Provide at least two private subnets across availability zones."
  }
}

variable "availability_zones" {
  description = "Availability zones to distribute subnets across."
  type        = list(string)
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "Provide at least two availability zones for high availability."
  }
}

variable "create_nat_gateway" {
  description = "Whether to provision a NAT gateway for private subnets."
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs for network observability."
  type        = bool
  default     = true
}

variable "flow_logs_retention_in_days" {
  description = "Retention period for VPC flow logs."
  type        = number
  default     = 14
}

variable "flow_logs_traffic_type" {
  description = "Traffic type captured by VPC flow logs (ACCEPT, REJECT, ALL)."
  type        = string
  default     = "ALL"
  validation {
    condition     = contains(["ACCEPT", "REJECT", "ALL"], var.flow_logs_traffic_type)
    error_message = "flow_logs_traffic_type must be ACCEPT, REJECT, or ALL."
  }
}

variable "flow_logs_log_group_kms_key_arn" {
  description = "Optional KMS key ARN used to encrypt flow log CloudWatch log groups."
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags applied to all resources."
  type        = map(string)
  default     = {}
}
