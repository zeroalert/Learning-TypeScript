import * as azure from "@pulumi/azure";
import * as azure_native from "@pulumi/azure-native";
import { tenantId } from "@pulumi/azure/config";
import * as pulumi from "@pulumi/pulumi";

// Configuration for our app
const resourceGroupName = "pulumi-appservice-rg"; // assuming this RG exist
const location = "East US";
const appServiceName = "my-webapp-example"; // name of the app service
const appServicePlanName = "my-appservice-plan"; // app serivce name plan 
const appInsightName = "my-appinsights-ai";

const resourceGroup = new azure_native.resources.ResourceGroup(resourceGroupName,{
    resourceGroupName: resourceGroupName,
    location: location,
});

const appServicePlan = new azure_native.web.AppServicePlan(appServicePlanName,{
    resourceGroupName: resourceGroup.name,
    location: location,
    name: appServicePlanName,
    kind: "Windows",
    sku: {
      name: "B1",
      tier: "Basic",
    }
});

const appInsight = new azure_native.applicationinsights.Component(appInsightName,{
  resourceGroupName: resourceGroup.name,
  resourceName: appInsightName,
  location: resourceGroup.location,
  kind: "web",
  applicationType: "web",
  tags: {
    environment: "development",
    project: "web-app",
  }
})

const appService = new azure_native.web.WebApp(appServiceName,{
    resourceGroupName: resourceGroup.name,
    location: location,
    name: appServiceName,
    serverFarmId: appServicePlan.id, 
    siteConfig: {
      nodeVersion: "16-lts",
      appSettings: [{
        name: "WEBSITE_NODE_DEFAULT_VERSION",
        value: "~16", 
      },
      {
        name: "MY_CUSTOM_SETTING",
        value: "Hello from Pulumi",
      },
    ],
    },
    httpsOnly: true,

});

// Create a staging deployment slot
const stagingslot = new azure_native.web.WebAppSlot("staging-slot",{
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    name: appService.name,
    slot: "staging", 
    serverFarmId: appServicePlan.id,
    siteConfig: {
      linuxFxVersion: "NODE|16-lts",
      appSettings: [
        {
        name: "APP_ENV", value: "Staging"
      },
    ],
    },
    httpsOnly: true,
});

// Create an Azure SQL Server
const sqlServer = new azure_native.sql.Server("my-sql-server",{
  resourceGroupName: resourceGroup.name,
  serverName: "myserver-pulumi-demo", 
  location: resourceGroup.location,
  version: "12.0",
  administratorLogin: "pulumiadmin",
  administratorLoginPassword: "StrongPassword!123",
  tags: {
    environment: "dev",
    project: "pulumi-sql",
  }
});

// Create an Azure SQL Database within the server
const sqlDatabase = new azure_native.sql.Database("my-sql-database",{
  resourceGroupName: resourceGroup.name,
  serverName: sqlServer.name,
  location: resourceGroup.location,
  sku: {
    name: "S0", // Standard tier
    tier: "Standard",
    capacity: 10,
  },
  collation: "SQL_Latin1_General_CP1_CI_AS",
  maxSizeBytes: 268435456000,
})

// Create an Azure Cosmos DB Account 
const cosmosdbAccount = new azure_native.cosmosdb.DatabaseAccount("my-cosmosdb-account",{
  resourceGroupName: resourceGroup.name, 
  accountName: "mypulumi-cosmosdb-acc",
  location: resourceGroup.location,
  databaseAccountOfferType: "Standard",
  capabilities: [
    { name: "EnableCassandra" },
  ],
  consistencyPolicy: {
    defaultConsistencyLevel: "Session",
  },
  locations: [
    {
      locationName: resourceGroup.location,
      failoverPriority: 0,
    },
    {
      locationName: "East US",
      failoverPriority: 1,
    },
  ],
  tags: {
    environment: "dev",
    project: "pulumi-cosmosdb",
  },
});

// Create a cosmos db sql api database 
const cosmosdbSqlDatabase = new azure_native.cosmosdb.SqlResourceSqlDatabase("my-sql-database-cosmos",{
  resourceGroupName: resourceGroup.name, 
  accountName: cosmosdbAccount.name,
  databaseName: "ProductCatalog",
  resource: { id: "ProductCatalog" },
  options: { throughput: 400},
});

// Create a cosmos db sql API container equivalent to a collection or table
const cosmosdbSqlContainer = new azure_native.cosmosdb.SqlResourceSqlContainer("my-sql-container",{
  resourceGroupName: resourceGroup.name,
  accountName: cosmosdbAccount.name, 
  databaseName: cosmosdbSqlDatabase.name, 
  containerName: "Products",
  resource: {
    id: "Products",
    partitionKey: {
      paths: ["/category"],
      kind: "Hash",
    },
  indexingPolicy: {
    indexingMode: "Consistent",
    includedPaths: [{ path: "/"}],
    excludedPaths: [{ path: "/_etgag/?"}],
  },
},
  options: {
    throughput: 400,
  },
  
});

// Configure a firewall rule to allow azure services to access the server
const azureServicesFirewallRule = new azure_native.sql.FirewallRule("azure-services-rule",{
  resourceGroupName: resourceGroup.name,
  serverName: sqlServer.name,
  firewallRuleName: "AllowMyIP",
  startIpAddress: "203.0.113.10",
  endIpAddress: "203.0.113.10",
});

// Create an Azure Redis Instance
const redisCache = new azure_native.redis.Redis("my-redis-cache",{
  resourceGroupName: resourceGroup.name, 
  name: "pulumi-redis-cache",
  location: resourceGroup.location,
  sku: {
    name: "Standard",
    family: "C",
    capacity: 1,
  },
  minimumTlsVersion: "1.2",
  enableNonSslPort: false,
  tags: {
    environment: "dev",
    purpose: "caching",
  }
});

const virtualNetwork = new azure_native.network.VirtualNetwork("my-vnet",{
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    addressSpace: {
      addressPrefixes: ["10.0.0.0/16"]
    },
});

const subnet = new azure_native.network.Subnet("my-subnet",{
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name, 
    addressPrefix: "10.0.1.0/24"
});

// Create a Public IP for the load balancer
const publicIp = new azure_native.network.PublicIPAddress("my-lb-public-ip",{
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    publicIPAllocationMethod: azure_native.network.IPAllocationMethod.Static,
    sku: {
      name: azure_native.network.PublicIPAddressSkuName.Standard,
    },
});

// Create the Azure Load Balancer 
const LoadBalancer = new azure_native.network.LoadBalancer("my-http-lb",{
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
      name: azure_native.network.LoadBalancerSkuName.Standard,
    },
    frontendIPConfigurations: [{
      name: "my-lb-frontend",
      publicIPAddress: {
        id: publicIp.id,
      },
    }],
    backendAddressPools: [{
      name: "my-lb-backend-pool",
    }],
    probes: [{
      name: "my-lb-healthprobe",
      protocol: azure_native.network.ProbeProtocol.Tcp,
      port: 80,
      intervalInSeconds: 5,
      numberOfProbes: 2,
    }],
    loadBalancingRules: [{
      name: "my-lb-http-rule",
      frontendIPConfiguration: {
        id: "$self/backendAddressPools/my-lb-backend-pool",
      },
      backendAddressPool: {
        id: "$selfbackendAddressPools/my-lb-backendpool",
      },
      probe: {
            id: "$self/probes/my-lb-healthprobe",
      },
      protocol: azure_native.network.TransportProtocol.Tcp,
      frontendPort: 80,
      backendPort: 80,
      enableFloatingIP: false,
      idleTimeoutInMinutes: 4,
      loadDistribution: azure_native.network.LoadDistribution.Default
    }],

});

// Application Gateway requires a dedicated subnet, minimum size /27
const appGatewaySubnet = new azure_native.network.Subnet("my-appgw-subnet",{
    resourceGroupName: resourceGroup.name, 
    virtualNetworkName: virtualNetwork.name,
    addressPrefix: "10.1.1.0/24"
});

// Create the public Ip for appgw
const publicIpAppgw = new azure_native.network.PublicIPAddress("my-appgw-public-ip",{
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    publicIPAllocationMethod: azure_native.network.IPAllocationMethod.Static,
    sku: {
      name: azure_native.network.PublicIPAddressSkuName.Standard,
    },
});

// Create the application gateway 
const applicationGateway = new azure_native.network.ApplicationGateway('my-app-gateway',{
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
      name: azure_native.network.ApplicationGatewaySkuName.Standard_v2,
      tier: azure_native.network.ApplicationGatewayTier.Standard_v2,
      capacity: 2,
    },
    gatewayIPConfigurations: [{
        name: "appgw-ip-config",
        subnet: {
            id: appGatewaySubnet.id,
        },
    }],
    frontendIPConfigurations: [{
        name: "appgw-frontend-ip",
        publicIPAddress: {
            id: publicIpAppgw.id,
        },
    }],
    frontendPorts: [{
        name: "appgw-frontend-port-80",
        port: 80,
    }],
    backendAddressPools: [{
        name: "apgw-backend-pool-web",
    }],
    backendHttpSettingsCollection: [{
        name: "appgw-backend-http-settings",
        port: 80,
        protocol: azure_native.network.ApplicationGatewayCookieBasedAffinity.Disabled,
        requestTimeout: 20,
        probe: {
            id: "$self/probes/appgw-http-probe",
        },
    }],
    httpListeners: [{
        name: "appgw-http-listener",
        frontendIPConfiguration: {
            id: "$self/frontendIPConfigurations/appgw-frontend-ip",
        },
        frontendPort: {
            id: "$self/frontendPorts/appgw-frontend-port-80",
        },
        protocol: azure_native.network.ApplicationGatewayProtocol.Http,
        requireServerNameIndication: false,
    }],
    requestRoutingRules: [{
        name: "appgw-routing-rule-basic",
        ruleType: azure_native.network.ApplicationGatewayRequestRoutingRuleType.Basic,
        httpListener: {
            id: "$self//httpListeners/appgw-http-listener",
        },
        backendAddressPool: {
          id: "$self//httpListeners//backendAddressPools/appgw-backend-pool-web",
        },
        backendHttpSettings: {
          id: "$self/backendHttpSettingsCollection/appgw-backend-http-settings",
        },
    }],
    probes: [{
        name: "appgw-http-probe",
        protocol: azure_native.network.ApplicationGatewayProtocol.Http,
        host: "localhost",
        path: "/health",
        port: 80,
        interval: 30,
        timeout: 30,
        unhealthyThreshold: 3,
    }],
});

const keyVault = new azure_native.keyvault.Vault("myKeyVault",{
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    vaultName: "mysecureappkeyvault12345",
    properties: {
      sku: {
          family: "A",
          name: "standard",
      },
      tenantId: "YOUR_AZURE_TENANT_ID",
      enabledForDeployment: true,
      enabledForDiskEncryption: true,
      enabledForTemplateDeployment: true, 
      accessPolicies: [{
      tenantId: "YOUR_AZURE_TENANT_ID",
      objectId: "YOUR_AZURE_TENANT_ID",
      permissions: {
          keys: ["get", "list", "create", "delete", "recover", "backup", "restore", "import", "update", "sign", "verify", "encrypt", "decrypt", "wrapKey", "unwrapKey"],
          secrets: ["get", "list", "set", "delete", "recover", "backup", "restore"],
          certificates: ["get", "list", "delete", "create", "import", "update", "managecontacts", "manageissuers", "getissuers", "listissuers", "recover", "backup", "restore"],
      },
    }],
    },
});



export const keyVaultUri = keyVault.properties.vaultUri;
export const redisCacheHostname = redisCache.hostName;
export const redisCachePrimaryConnectionString = redisCache.accessKeys;
export const cosmosdbAccountName = cosmosdbAccount.name;
export const cosmosdbSqlContainerName = cosmosdbSqlContainer.name;
export const cosmosdbEndpoint = cosmosdbAccount.documentEndpoint;
export const sqlDatabaseName = sqlDatabase.name;
export const sqlDatabaseID = sqlDatabase.id;
export const endpoint = pulumi.interpolate`https://${appService.defaultHostName}`;
export const sqlServerName = sqlServer.name;
export const sqlServerFullyQualifiedDomainName = sqlServer.fullyQualifiedDomainName;