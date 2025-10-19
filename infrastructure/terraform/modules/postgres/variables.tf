variable "project" {
  type        = string
  description = "Project name used for tags and identifiers."
}

variable "environment" {
  type        = string
  description = "Deployment environment name."
}

variable "vpc_id" {
  type        = string
  description = "VPC identifier that hosts the database."
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet identifiers for the database subnet group."
}

variable "port" {
  type        = number
  description = "Database port to expose."
  default     = 5432
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version."
  default     = "15.4"
}

variable "instance_class" {
  type        = string
  description = "Instance class for the RDS instance."
  default     = "db.m6g.large"
}

variable "allocated_storage" {
  type        = number
  description = "Initial allocated storage in GB."
  default     = 100
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage in GB for autoscaling."
  default     = 512
}

variable "master_username" {
  type        = string
  description = "Master database username."
}

variable "master_password" {
  type        = string
  description = "Master database password."
  sensitive   = true
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on destroy (set false for production)."
  default     = false
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain automated backups."
  default     = 7
}

variable "apply_immediately" {
  type        = bool
  description = "Apply modifications immediately or during maintenance window."
  default     = false
}

variable "allowed_security_group_ids" {
  type        = list(string)
  description = "Security groups allowed to access the database."
  default     = []
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed to access the database."
  default     = []
}

variable "allowed_ipv6_cidr_blocks" {
  type        = list(string)
  description = "IPv6 CIDRs allowed to access the database."
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Additional resource tags."
  default     = {}
}
