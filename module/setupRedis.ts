import { Config } from "@pulumi/pulumi";
import { pulumi } from "@vizientinc/pulumi";
import * as cache from "@pulumi/azure-native-v2/cache";
import { AzureBuilder } from "@vizientinc/azure-builder";

export interface RedisEnterpriseConfig {
  skuName: "Enterprise_E10" | "Enterprise_E20" | "Enterprise_E50" | "Enterprise_E100" | "EnterpriseFlash_F300" | "EnterpriseFlash_F700" | "EnterpriseFlash_F1500";
  capacity: number;
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
  const redisCluster = new cache.RedisEnterprise(`atscale-redis-${args.env}`, {
    resourceGroupName: args.azureBuilder.resourceGroupName,
    location: args.location,
    sku: {
      name: args.redisConfig.skuName,
      capacity: args.redisConfig.capacity,
    },
    minimumTlsVersion: "1.2",
  });

  // Create Redis Enterprise Database
  const redisDatabase = new cache.Database(`atscale-redis-db-${args.env}`, {
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
    databaseName: redisDatabase.name,
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

  // Private endpoint for Redis Enterprise
  const redisPrivateEndpoint = peBuilder.Network.PrivateEndpoint.ForRedis(
    "atscale-redis-endpoint",
    redisCluster,
    args.vnetPrivateLinkSubnet
  );

  // Note: DNS zone group resource type for Enterprise differs
  const redisDnsZones = {
    "microsoft.cache/redisenterprise:rediscache": [
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
  const redisUser = pulumi.output("");
  const redisPassword = redisKeys.primaryKey;
  const redisSslEnabled = pulumi.output(true);

  const redisConnectionString = pulumi.interpolate`rediss://${redisHost}:${redisPort}/0?password=${redisPassword}`;

  return {
    redisCluster,
    redisDatabase,
    redisKeys,
    redisHost,
    redisPort,
    redisUser,
    redisPassword,
    redisSslEnabled,
    redisConnectionString,
    redisPrivateEndpoint,
    redisDnsZoneGroup,
  };
}