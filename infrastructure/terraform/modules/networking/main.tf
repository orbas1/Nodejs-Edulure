terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30"
    }
  }
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(
    {
      Name = "${var.project}-vpc-${var.environment}"
    },
    var.tags,
  )
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags = merge(
    {
      Name = "${var.project}-igw-${var.environment}"
    },
    var.tags,
  )
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  map_public_ip_on_launch = true
  availability_zone       = element(var.availability_zones, count.index)
  tags = merge(
    {
      Name = "${var.project}-public-${var.environment}-${count.index}"
      Tier = "public"
    },
    var.tags,
  )
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = element(var.availability_zones, count.index)
  tags = merge(
    {
      Name = "${var.project}-private-${var.environment}-${count.index}"
      Tier = "private"
    },
    var.tags,
  )
}

resource "aws_eip" "nat" {
  count      = var.create_nat_gateway ? 1 : 0
  vpc        = true
  depends_on = [aws_internet_gateway.this]
  tags = merge(
    {
      Name = "${var.project}-nat-eip-${var.environment}"
    },
    var.tags,
  )
}

resource "aws_nat_gateway" "this" {
  count         = var.create_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  tags = merge(
    {
      Name = "${var.project}-nat-${var.environment}"
    },
    var.tags,
  )
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags = merge(
    {
      Name = "${var.project}-public-rt-${var.environment}"
    },
    var.tags,
  )
}

resource "aws_route" "public" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count = var.create_nat_gateway ? 1 : 0
  vpc_id = aws_vpc.this.id
  tags = merge(
    {
      Name = "${var.project}-private-rt-${var.environment}"
    },
    var.tags,
  )
}

resource "aws_route" "private" {
  count                    = var.create_nat_gateway ? 1 : 0
  route_table_id           = aws_route_table.private[0].id
  destination_cidr_block   = "0.0.0.0/0"
  nat_gateway_id           = aws_nat_gateway.this[0].id
}

resource "aws_route_table_association" "private" {
  count          = var.create_nat_gateway ? length(aws_subnet.private) : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[0].id
}

output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  value = [for subnet in aws_subnet.public : subnet.id]
}

output "private_subnet_ids" {
  value = [for subnet in aws_subnet.private : subnet.id]
}
