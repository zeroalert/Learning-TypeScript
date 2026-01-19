
Azure Virtual Networks (VNets) are fundamental building blocks for private network connectivity in Azure. They enable Azure resources, such as Virtual Machines, to securely communicate with each other, the internet, and on-premises networks. Subnets further segment a VNet into smaller, manageable address spaces, allowing for more granular network security and organization.

## Understanding Azure Virtual Networks (VNets)

An Azure Virtual Network is a logically isolated section of the Azure cloud dedicated to a subscription. It allows you to provision your own private, isolated network in the cloud. This isolation means that only resources within your VNet, or those explicitly connected to it, can communicate with each other unless you configure specific routing rules or public endpoints.

Each VNet must have a unique private IP address space defined using CIDR (Classless Inter-Domain Routing) notation. For example, `10.0.0.0/16` provides a large address space for many resources, while `192.168.1.0/24` offers a smaller, more contained range. It is crucial to plan this address space carefully to avoid overlaps with other VNets or on-premises networks you might want to connect in the future.

VNets provide several key features:

- **Isolation**: Resources within a VNet are isolated from other VNets by default.
- **Communication**: Resources within the same VNet can communicate with each other.
- **Internet Connectivity**: By default, resources in a VNet can communicate outbound to the internet. Inbound internet communication requires public IP addresses or Load Balancers.
- **On-premises Connectivity**: VNets can be connected to on-premises networks using VPN Gateway or ExpressRoute.
- **VNet Peering**: VNets can be connected to other VNets within the same or different Azure regions, enabling seamless communication between them.
## Working with Subnets

Subnets are logical divisions of a VNet's address space. When you create a VNet, you define its overall IP address range. You then divide this range into one or more subnets. Each subnet is assigned a portion of the VNet's address space and must have a unique address range within that VNet.

**Key characteristics of subnets:**

- **IP Address Allocation**: Resources deployed into a subnet receive an IP address from that subnet's range.
- **Isolation and Security**: Subnets enable you to segment your VNet and apply different network security rules (Network Security Groups - NSGs) to different groups of resources.
- **Service Integration**: Many Azure services (like Azure App Service, Azure Kubernetes Service) require dedicated subnets for integration.
- **Network Virtual Appliances (NVAs)**: You can deploy NVAs (e.g., firewalls) into specific subnets and route traffic through them.

When creating a subnet, Azure reserves the first four and the last IP address within each subnet for internal use. For example, in a subnet with an address range of `10.0.0.0/24`:

- `10.0.0.0`: Network address
- `10.0.0.1`: Default gateway
- `10.0.0.2`: Azure DNS reserved
- `10.0.0.3`: Azure DNS reserved
- `10.0.0.255`: Broadcast address

This means a `/24` subnet, which theoretically has 256 IP addresses, provides 251 usable IP addresses for your resources.

Azure services often benefit from or require dedicated subnets.

- **Real-world Scenario**: A company is deploying a complex microservices architecture using Azure Kubernetes Service (AKS) and also requires a private endpoint for its Azure SQL Database.
- **Subnet Configuration within a VNet (e.g., `MicroservicesVNet` with 172.16.0.0/16)**:
    - `AksSubnet`: `172.16.1.0/24` (dedicated for AKS nodes and pods)
    - `PrivateEndpointSubnet`: `172.16.2.0/24` (dedicated for Azure Private Endpoints)
    - `GatewaySubnet`: `172.16.3.0/27` (a small, specific subnet required for Azure VPN Gateway or ExpressRoute Gateway, which needs at least a /27) By segregating these services into dedicated subnets, you enforce strict network boundaries and adhere to service-specific requirements, such as AKS needing a subnet with enough IP addresses for its node and pod scaling. The `GatewaySubnet` is a prime example of a specialized subnet that must meet specific size requirements.
``` typescript

import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

// Create an Azure Resource Group
const resourceGroup = new azure_native.resources.ResourceGroup("my-vnet-rg", {
    resourceGroupName: "my-pulumi-vnet-rg", // Explicitly naming the resource group
    location: "East US", // Specify the desired Azure region
});

// Create an Azure Virtual Network
const virtualNetwork = new azure_native.network.VirtualNetwork("my-vnet", {
    // Associate the VNet with the resource group
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    // Define the address space for the VNet
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"], // A /16 address space provides a large network
    },
    // Explicitly name the Virtual Network resource in Azure
    virtualNetworkName: "my-pulumi-vnet",
    // Optional: Enable DDoS Protection Standard (requires a DDoS Protection Plan)
    // ddosProtectionPlan: {
    //     id: "/subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.Network/ddosProtectionPlans/<ddos-plan-name>",
    //     enable: true,
    // },
    // Optional: DNS servers for resources within this VNet
    // dnsServers: ["8.8.8.8", "8.8.4.4"], // Example: Google DNS servers
}, { dependsOn: [resourceGroup] }); // Ensure resourceGroup is created before VNet

// Create a subnet within the Virtual Network for web servers
const webSubnet = new azure_native.network.Subnet("web-subnet", {
    // Subnets are nested under Virtual Networks
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
    // Define the address prefix for the subnet
    addressPrefix: "10.0.1.0/24", // A /24 subnet provides 251 usable IPs (256 - 5 reserved)
    // Explicitly name the subnet
    subnetName: "WebSubnet",
    // Optional: Configure Service Endpoints for specific Azure services
    // serviceEndpoints: [{ service: "Microsoft.Storage" }],
    // Optional: Configure a Network Security Group for this subnet
    // networkSecurityGroup: {
    //     id: "/subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.Network/networkSecurityGroups/<nsg-name>",
    // },
    // Optional: Delegate subnet to a specific service (e.g., Azure Container Instances, Azure SQL Managed Instance)
    // delegation: {
    //     serviceName: "Microsoft.ContainerInstance/containerGroups",
    //     actions: ["Microsoft.Network/virtualNetworks/subnets/join/action"],
    // },
}, { dependsOn: [virtualNetwork] }); // Ensure virtualNetwork is created before subnet

// Create another subnet for database servers
const dbSubnet = new azure_native.network.Subnet("db-subnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
    addressPrefix: "10.0.2.0/24",
    subnetName: "DbSubnet",
}, { dependsOn: [virtualNetwork] });

// Export the VNet ID and subnet IDs for reference
export const vnetId = virtualNetwork.id;
export const webSubnetId = webSubnet.id;
export const dbSubnetId = dbSubnet.id;
export const vnetName = virtualNetwork.name;
```

