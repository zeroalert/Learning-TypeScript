import { Config } from "@pulumi/pulumi";
import { pulumi } from "@vizientinc/pulumi";
import * as cache from "@pulumi/azure-native/cache/v20241001";
import { AzureBuilder } from "@vizientinc/azure-builder";

export interface RedisEnterpriseConfig {
  skuName: "Balanced_B0" | "Balanced_B1" | "Balanced_B3" | "Balanced_B5" | "Balanced_B10" | "Balanced_B20" | "Balanced_B50" | "Balanced_B100" | "Balanced_B150" | "Balanced_B250" | "Balanced_B350" | "Balanced_B500" | "Balanced_B700" | "Balanced_B1000" | "MemoryOptimized_M10" | "MemoryOptimized_M20" | "MemoryOptimized_M50" | "MemoryOptimized_M100" | "MemoryOptimized_M150" | "MemoryOptimized_M250" | "MemoryOptimized_M350" | "MemoryOptimized_M500" | "MemoryOptimized_M700" | "MemoryOptimized_M1000" | "MemoryOptimized_M1500" | "MemoryOptimized_M2000" | "ComputeOptimized_X3" | "ComputeOptimized_X5" | "ComputeOptimized_X10" | "ComputeOptimized_X20" | "ComputeOptimized_X50" | "ComputeOptimized_X100" | "ComputeOptimized_X150" | "ComputeOptimized_X250" | "ComputeOptimized_X350" | "ComputeOptimized_X500" | "FlashOptimized_A250" | "FlashOptimized_A500" | "FlashOptimized_A700" | "FlashOptimized_A1000" | "FlashOptimized_A1500" | "FlashOptimized_A2000" | "FlashOptimized_A4500";
  minimumTlsVersion?: "1.0" | "1.1" | "1.2";
  zones?: string[];
  clusteringPolicy?: "EnterpriseCluster" | "OSSCluster";
  evictionPolicy?: "AllKeysLFU" | "AllKeysLRU" | "AllKeysRandom" | "NoEviction" | "VolatileLFU" | "VolatileLRU" | "VolatileRandom" | "VolatileTTL";
  port?: number;
}

export function setupRedis(args: {
  location: string;
  env: string;
  redisConfig: RedisEnterpriseConfig;
  azureBuilder: AzureBuilder;
  vnetPrivateLinkSubnet: string;
  redisPrivateDnsZoneId: string;
}) {
  const config = new Config();

  // Create Redis Enterprise Cluster
  const redisCluster = new cache.RedisEnterprise(`atscale-${args.env}`, {
    resourceGroupName: args.azureBuilder.resourceGroupName,
    location: args.location,
    sku: {
      name: args.redisConfig.skuName,
    },
    minimumTlsVersion: args.redisConfig.minimumTlsVersion ?? "1.2",
    ...(args.redisConfig.zones && { zones: args.redisConfig.zones }),
    tags: args.azureBuilder.tags,
  });

  // Create Redis Enterprise Database (must be named "default")
  const redisDatabase = new cache.Database(`atscale-redis-db-${args.env}`, {
    databaseName: "default",
    resourceGroupName: args.azureBuilder.resourceGroupName,
    clusterName: redisCluster.name,
    clientProtocol: "Encrypted",
    clusteringPolicy: args.redisConfig.clusteringPolicy ?? "EnterpriseCluster",
    evictionPolicy: args.redisConfig.evictionPolicy ?? "NoEviction",
    port: args.redisConfig.port ?? 10000,
  });

  // Get access keys for the database
  const redisKeys = cache.listDatabaseKeysOutput({
    resourceGroupName: args.azureBuilder.resourceGroupName,
    clusterName: redisCluster.name,
    databaseName: "default",
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

  // Private endpoint for Redis Enterprise - using Build directly to avoid API version mismatch
  const redisPrivateEndpoint = peBuilder.Network.PrivateEndpoint.Build(
    "atscale-redis-endpoint",
    {
      subnet: { id: args.vnetPrivateLinkSubnet },
      privateLinkServiceConnections: [
        {
          name: "atscale-redis-connection",
          privateLinkServiceId: redisCluster.id,
          groupIds: ["redisCache"],
        },
      ],
    }
  );

  // DNS zone group for Redis Enterprise
  const redisDnsZones = {
    "redisCache": [
      { name: "privatelink.redisenterprise.cache.azure.net", id: args.redisPrivateDnsZoneId },
    ],
  };

  const redisDnsZoneGroup = peBuilder.Network.PrivateDnsZoneGroup.ForPrivateEndpointCustom(
    "atscale-redis-dnszonegroup",
    redisPrivateEndpoint,
    redisDnsZones
  );

  const redisHost = redisCluster.hostName;
  const redisPort = pulumi.output(args.redisConfig.port ?? 10000);
  const redisPassword = redisKeys.primaryKey;

  const redisConnectionString = pulumi.interpolate`rediss://${redisHost}:${redisPort}/0?password=${redisPassword}`;

  return {
    redisCluster,
    redisDatabase,
    redisKeys,
    redisHost,
    redisPort,
    redisPassword,
    redisConnectionString,
    redisPrivateEndpoint,
    redisDnsZoneGroup,
  };
}
