import { Config } from "@pulumi/pulumi";
import { pulumi } from "@vizientinc/pulumi";
import { Redis, listRedisKeysOutput } from "@pulumi/azure-native/cache";
import { AzureBuilder } from "@vizientinc/azure-builder";

export interface RedisConfig {
  skuName: string;
  skuFamily: string;
  skuCapacity: number;
  enableNonSslPort: boolean;
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

  const redis = new Redis(`atscale-redis-${args.env}`, {
    resourceGroupName: args.azureBuilder.resourceGroupName,
    location: args.location,
    sku: {
      name: args.redisConfig.skuName,
      family: args.redisConfig.skuFamily,
      capacity: args.redisConfig.skuCapacity,
    },
    enableNonSslPort: args.redisConfig.enableNonSslPort,
    minimumTlsVersion: "1.2",
    redisVersion: "7.0",
    publicNetworkAccess: "Disabled",
  });

  const redisKeys = listRedisKeysOutput({
    resourceGroupName: args.azureBuilder.resourceGroupName,
    name: redis.name,
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

  const redisPrivateEndpoint = peBuilder.Network.PrivateEndpoint.ForRedis(
    "atscale-redis-endpoint",
    redis,
    args.vnetPrivateLinkSubnet
  );

  const redisDnsZones = {
    "microsoft.cache/redis:rediscache": [
      { name: "privatelink.redis.cache.windows.net", id: args.redisPrivateDnsZoneId },
    ],
    "microsoft.cache/redis:rediscachesecondary": [
      { name: "privatelink.redis.cache.windows.net", id: args.redisPrivateDnsZoneId },
    ],
  };

  const redisDnsZoneGroup = peBuilder.Network.PrivateDnsZoneGroup.ForPrivateEndpointCustom(
    "atscale-redis-dnszonegroup",
    redisPrivateEndpoint,
    redisDnsZones
  );

  const redisHost = redis.hostName;
  const redisPort = pulumi.output(6380);
  const redisUser = pulumi.output("");
  const redisPassword = redisKeys.primaryKey;
  const redisSslEnabled = pulumi.output(true);

  const redisConnectionString = pulumi.interpolate`rediss://${redisHost}:${redisPort}/0?password=${redisPassword}`;

  return {
    redis,
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
