import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("resourceGroup");

// Create an Azure Storage Account
const storageAccount = new storage.StorageAccount("sa", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

// Export the storage account name
export const storageAccountName = storageAccount.name;



import { Config } from "@pulumi/pulumi";
import { pulumi } from "@vizientinc/pulumi";
import * as cache from "@pulumi/azure-native/cache/v20240301";
import * as network from "@pulumi/azure-native/network";
import { AzureBuilder } from "@vizientinc/azure-builder";

export interface RedisManagedConfig {
  skuName: "Basic" | "Standard" | "Premium";
  skuFamily: "C" | "P"; // C = Basic/Standard, P = Premium (memory-optimized)
  capacity: number; // 0-6 for C family, 1-4 for P family
  enableNonSslPort?: boolean;
  minimumTlsVersion?: "1.0" | "1.1" | "1.2";
  redisVersion?: string;
  shardCount?: number; // For Premium clustered cache
}

export function setupRedis(args: {
  location: string;
  env: string;
  redisConfig: RedisManagedConfig;
  azureBuilder: AzureBuilder;
  vnetPrivateLinkSubnet: string;
  redisPrivateDnsZoneId: string;
}) {
  const config = new Config();

  // Create Azure Cache for Redis (Managed)
  const redisCache = new cache.Redis(`atscale-redis-${args.env}`, {
    resourceGroupName: args.azureBuilder.resourceGroupName,
    location: args.location,
    sku: {
      name: args.redisConfig.skuName,
      family: args.redisConfig.skuFamily,
      capacity: args.redisConfig.capacity,
    },
    enableNonSslPort: args.redisConfig.enableNonSslPort ?? false,
    minimumTlsVersion: args.redisConfig.minimumTlsVersion ?? "1.2",
    publicNetworkAccess: "Disabled",
    redisVersion: "7",
  });

  // Get access keys for the Redis cache
  const redisKeys = cache.listRedisKeysOutput({
    resourceGroupName: args.azureBuilder.resourceGroupName,
    name: redisCache.name,
  });

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

  // Private endpoint for managed Redis
  const redisPrivateEndpoint = peBuilder.Network.PrivateEndpoint.Build(
    "atscale-redis-endpoint",
    {
      subnet: { id: args.vnetPrivateLinkSubnet },
      privateLinkServiceConnections: [
        {
          name: "atscale-redis-connection",
          privateLinkServiceId: redisCache.id,
          groupIds: ["redisCache"], // groupId for managed Redis
        },
      ],
    }
  );

  // DNS zone group for managed Redis - use privatelink.redis.cache.windows.net
  const redisDnsZoneGroup = new network.PrivateDnsZoneGroup(
    "atscale-redis-dnszonegroup",
    {
      privateDnsZoneGroupName: "default",
      privateEndpointName: redisPrivateEndpoint.name,
      resourceGroupName: config.require("vnetRg"),
      privateDnsZoneConfigs: [
        {
          name: "redis-config",
          privateDnsZoneId: args.redisPrivateDnsZoneId,
        },
      ],
    }
  );

  const redisHost = redisCache.hostName;
  const redisPort = redisCache.sslPort; // 6380 for SSL
  const redisPassword = redisKeys.primaryKey;

  return {
    redisCache,
    redisKeys,
    redisHost,
    redisPort,
    redisPassword,
    redisPrivateEndpoint,
    redisDnsZoneGroup,
  };
}import { Config } from "@pulumi/pulumi";
import { pulumi } from "@vizientinc/pulumi";
import * as cache from "@pulumi/azure-native/cache/v20240301";
import * as network from "@pulumi/azure-native/network";
import { AzureBuilder } from "@vizientinc/azure-builder";

export interface RedisManagedConfig {
  skuName: "Basic" | "Standard" | "Premium";
  skuFamily: "C" | "P"; // C = Basic/Standard, P = Premium (memory-optimized)
  capacity: number; // 0-6 for C family, 1-4 for P family
  enableNonSslPort?: boolean;
  minimumTlsVersion?: "1.0" | "1.1" | "1.2";
  redisVersion?: string;
  shardCount?: number; // For Premium clustered cache
}

export function setupRedis(args: {
  location: string;
  env: string;
  redisConfig: RedisManagedConfig;
  azureBuilder: AzureBuilder;
  vnetPrivateLinkSubnet: string;
  redisPrivateDnsZoneId: string;
}) {
  const config = new Config();

  // Create Azure Cache for Redis (Managed)
  const redisCache = new cache.Redis(`atscale-redis-${args.env}`, {
    resourceGroupName: args.azureBuilder.resourceGroupName,
    location: args.location,
    sku: {
      name: args.redisConfig.skuName,
      family: args.redisConfig.skuFamily,
      capacity: args.redisConfig.capacity,
    },
    enableNonSslPort: args.redisConfig.enableNonSslPort ?? false,
    minimumTlsVersion: args.redisConfig.minimumTlsVersion ?? "1.2",
    publicNetworkAccess: "Disabled",
    redisVersion: "7",
  });

  // Get access keys for the Redis cache
  const redisKeys = cache.listRedisKeysOutput({
    resourceGroupName: args.azureBuilder.resourceGroupName,
    name: redisCache.name,
  });

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

  // Private endpoint for managed Redis
  const redisPrivateEndpoint = peBuilder.Network.PrivateEndpoint.Build(
    "atscale-redis-endpoint",
    {
      subnet: { id: args.vnetPrivateLinkSubnet },
      privateLinkServiceConnections: [
        {
          name: "atscale-redis-connection",
          privateLinkServiceId: redisCache.id,
          groupIds: ["redisCache"], // groupId for managed Redis
        },
      ],
    }
  );

  // DNS zone group for managed Redis - use privatelink.redis.cache.windows.net
  const redisDnsZoneGroup = new network.PrivateDnsZoneGroup(
    "atscale-redis-dnszonegroup",
    {
      privateDnsZoneGroupName: "default",
      privateEndpointName: redisPrivateEndpoint.name,
      resourceGroupName: config.require("vnetRg"),
      privateDnsZoneConfigs: [
        {
          name: "redis-config",
          privateDnsZoneId: args.redisPrivateDnsZoneId,
        },
      ],
    }
  );

  const redisHost = redisCache.hostName;
  const redisPort = redisCache.sslPort; // 6380 for SSL
  const redisPassword = redisKeys.primaryKey;

  return {
    redisCache,
    redisKeys,
    redisHost,
    redisPort,
    redisPassword,
    redisPrivateEndpoint,
    redisDnsZoneGroup,
  };
}
