import { Config } from "@pulumi/pulumi";
import { pulumi } from "@vizientinc/pulumi";
import * as cache from "@pulumi/azure-native/cache";
import { AzureBuilder } from "@vizientinc/azure-builder";

export interface RedisConfig {
  skuName: "Basic" | "Standard" | "Premium" | "Balanced_B0" | "Balanced_B1" | "Balanced_B3" | "Balanced_B5" | "Balanced_B10" | "Balanced_B20" | "Balanced_B50" | "Balanced_B100" | "Balanced_B150" | "Balanced_B250" | "Balanced_B350" | "Balanced_B500" | "Balanced_B700" | "Balanced_B1000" | "MemoryOptimized_M10" | "MemoryOptimized_M20" | "MemoryOptimized_M50" | "MemoryOptimized_M100" | "MemoryOptimized_M150" | "MemoryOptimized_M250" | "MemoryOptimized_M350" | "MemoryOptimized_M500" | "MemoryOptimized_M700" | "MemoryOptimized_M1000" | "MemoryOptimized_M1500" | "MemoryOptimized_M2000" | "ComputeOptimized_X3" | "ComputeOptimized_X5" | "ComputeOptimized_X10" | "ComputeOptimized_X20" | "ComputeOptimized_X50" | "ComputeOptimized_X100" | "ComputeOptimized_X150" | "ComputeOptimized_X250" | "ComputeOptimized_X350" | "ComputeOptimized_X500" | "FlashOptimized_A250" | "FlashOptimized_A500" | "FlashOptimized_A700" | "FlashOptimized_A1000" | "FlashOptimized_A1500" | "FlashOptimized_A2000" | "FlashOptimized_A4500";
  skuFamily?: "C" | "P";
  skuCapacity?: number;
  enableNonSslPort?: boolean;
  minimumTlsVersion?: "1.0" | "1.1" | "1.2";
  redisVersion?: "4" | "6";
  highAvailability?: "Enabled" | "Disabled";
  redundancyMode?: "ZoneRedundant" | "GeoRedundant" | "Disabled";
}

export function setupRedis(args: {
  location: string;
  env: string;
  redisConfig: RedisConfig;
  azureBuilder: AzureBuilder;
  vnetPrivateLinkSubnet: string;
  redisPrivateDnsZoneId: string;
}) {
  const config = new Config();

  // Build SKU object
  const skuArgs: any = {
    name: args.redisConfig.skuName,
  };
  if (args.redisConfig.skuFamily) {
    skuArgs.family = args.redisConfig.skuFamily;
  }
  if (args.redisConfig.skuCapacity !== undefined) {
    skuArgs.capacity = args.redisConfig.skuCapacity;
  }

  // Create Azure Cache for Redis (managed service)
  const redis = new cache.Redis(`atscale-redis-${args.env}`, {
    resourceGroupName: args.azureBuilder.resourceGroupName,
    location: args.location,
    sku: skuArgs,
    enableNonSslPort: args.redisConfig.enableNonSslPort ?? false,
    minimumTlsVersion: args.redisConfig.minimumTlsVersion ?? "1.2",
    ...(args.redisConfig.redisVersion && { redisVersion: args.redisConfig.redisVersion }),
    publicNetworkAccess: "Disabled",
    tags: args.azureBuilder.tags,
  });

  // Get access keys
  const redisKeys = cache.listRedisKeysOutput({
    resourceGroupName: args.azureBuilder.resourceGroupName,
    name: redis.name,
  });

  // Create separate AzureBuilder for private endpoint in shared infra VNet
  const peBuilder = new AzureBuilder({
    app: args.azureBuilder.tags.app,
    env: args.azureBuilder.tags.env,
    location: "eastus2",
    owneremail: args.azureBuilder.tags.owneremail,
    servicetier: args.azureBuilder.tags.servicetier,
    subscriptionId: args.azureBuilder.subscriptionId,
    tenantId: args.azureBuilder.tenantId,
  });

  peBuilder.setResourceGroup(config.require("vnetRg"));
  peBuilder.Network.setDefaultVirtualNetwork(config.require("vnet"), config.require("vnetRg"));

  // Private endpoint for Redis
  const redisPrivateEndpoint = peBuilder.Network.PrivateEndpoint.ForRedis(
    "atscale-redis-endpoint",
    redis,
    args.vnetPrivateLinkSubnet
  );

  // DNS zone group for Redis - using custom mapping due to DNS zone config
  const redisDnsZones = {
    "redisCache": [
      { name: "privatelink.redis.cache.windows.net", id: args.redisPrivateDnsZoneId },
    ],
  };

  const redisDnsZoneGroup = peBuilder.Network.PrivateDnsZoneGroup.ForPrivateEndpointCustom(
    "atscale-redis-dnszonegroup",
    redisPrivateEndpoint,
    redisDnsZones
  );

  const redisHost = redis.hostName;
  const redisPort = redis.sslPort;
  const redisPassword = redisKeys.primaryKey;

  const redisConnectionString = pulumi.interpolate`rediss://:${redisPassword}@${redisHost}:${redisPort}/0`;

  return {
    redis,
    redisKeys,
    redisHost,
    redisPort,
    redisPassword,
    redisConnectionString,
    redisPrivateEndpoint,
    redisDnsZoneGroup,
  };
}
