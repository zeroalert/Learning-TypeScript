import { Config } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import { AzureBuilder } from "@vizientinc/azure-builder";
import * as postgresFlex from "@pulumi/azure-native/dbforpostgresql/v20240801";

export function setupPostgres(args: {
  azureBuilder: AzureBuilder;
  app: string;
  env: string;
  location: string;
  instance: string;
  postgresDelegatedSubnet: pulumi.Input<string>;
  postgresPrivateDnsZoneId: string;
}) {
  const config = new Config();

  const postgresFlexServer = new postgresFlex.Server(
    `${args.app}-${args.env}-postgresqlserver`,
    {
      serverName: `vzn-${args.location}-${args.app}-${args.env}-dbflexserver-${args.instance}`,
      resourceGroupName: args.azureBuilder.resourceGroupName,
      location: args.location,
      administratorLogin: config.require("postgreSqlAdmin"),
      administratorLoginPassword: config.requireSecret("postgreSqlAdminPassword"),
      network: {
        publicNetworkAccess: "Disabled",
        delegatedSubnetResourceId: args.postgresDelegatedSubnet,
        privateDnsZoneArmResourceId: args.postgresPrivateDnsZoneId,
      },
      createMode: "Default",
      sku: {
        name: config.require("flexDBSkuName"),
        tier: "GeneralPurpose",
      },
      version: "15",
      storage: {
        storageSizeGB: config.requireNumber("postgreServerStorage"),
      },
      backup: {
        backupRetentionDays: 7,
        geoRedundantBackup: "Disabled",
      },
      tags: args.azureBuilder.tags,
    }
  );

  const atscaleDb = new postgresFlex.Database(`atscale-${args.env}-db`, {
    databaseName: "atscaledb",
    resourceGroupName: args.azureBuilder.resourceGroupName,
    serverName: postgresFlexServer.name,
  });

  const keycloakDb = new postgresFlex.Database(`keycloak-${args.env}-db`, {
    databaseName: "keycloakdb",
    resourceGroupName: args.azureBuilder.resourceGroupName,
    serverName: postgresFlexServer.name,
  });

  const pgwireDb = new postgresFlex.Database(`pgwire-${args.env}-db`, {
    databaseName: "pgwiredb",
    resourceGroupName: args.azureBuilder.resourceGroupName,
    serverName: postgresFlexServer.name,
  });

  return {
    postgresFlexServer,
    atscaleDb,
    keycloakDb,
    pgwireDb,
  };
}
