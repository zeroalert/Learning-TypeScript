This lesson focuses on deploying Network Virtual Appliances (NVAs), specifically Palo Alto firewalls, within Azure virtual networks and configuring Network Security Groups (NSGs) to control traffic flow. NVAs like Palo Alto firewalls provide advanced security features beyond what native Azure Firewall offers, including deep packet inspection, intrusion prevention, and advanced threat protection. NSGs, on the other hand, act as stateful packet filters at the subnet or NIC level, providing a foundational layer of network security within Azure.


## Understanding Network Virtual Appliances (NVAs) and Palo Alto Firewalls

Network Virtual Appliances (NVAs) are virtualized network functions that run on general-purpose servers and provide network services such as routing, firewalling, WAN optimization, and load balancing. In Azure, NVAs are typically deployed as virtual machines configured to forward and process network traffic. Palo Alto Networks firewalls are a prominent example of NVAs, renowned for their next-generation firewall capabilities. These capabilities include application-level visibility and control, user-based policies, intrusion prevention systems (IPS), URL filtering, and advanced threat protection, which can detect and block sophisticated cyber threats.

Deploying a Palo Alto firewall as an NVA in Azure typically involves creating a highly available pair of virtual machines (VMs) running the Palo Alto firewall software. These VMs are provisioned within an Azure Virtual Network and configured with multiple network interfaces: one for untrusted (internet-facing) traffic, one for trusted (internal network) traffic, and often a management interface. Traffic is then routed through these NVAs, allowing them to inspect and enforce security policies before forwarding the traffic to its destination.

### Palo Alto Firewall Deployment Topologies in Azure

Various topologies are available for deploying Palo Alto firewalls in Azure, each suited for different security and architectural requirements. Two common patterns are the hub-and-spoke model and a perimeter network (DMZ) design.

#### Hub-and-Spoke with Palo Alto NVA

In a hub-and-spoke architecture, the Palo Alto firewall typically resides in the central "hub" Virtual Network (VNet). Spoke VNets, containing application workloads, are peered with the hub VNet. All traffic between spokes, or between spokes and the internet/on-premises networks, is routed through the NVA in the hub. This centralizes security policy enforcement and simplifies management.

- **Example 1: Ingress/Egress Filtering** A company deploys its core applications in several spoke VNets. A Palo Alto firewall pair is deployed in the hub VNet. All internet-bound traffic from the spoke VNets is routed through the hub VNet to the Palo Alto firewalls, which perform URL filtering and IPS. Similarly, all incoming traffic from the internet destined for public-facing applications in the spokes first hits the Palo Alto firewalls for threat protection and policy enforcement before being forwarded.
- **Example 2: Inter-Spoke Communication** Two application teams, Team A and Team B, each have their applications deployed in separate spoke VNets. They need to communicate but with strict security controls. Routing is configured so that traffic from Team A's VNet to Team B's VNet traverses the Palo Alto firewalls in the hub. The firewall then applies policies to allow only specific application protocols (e.g., HTTPS on port 443, not SSH on port 22) between the two teams' applications, even if they are within the same broader trust zone.

#### Perimeter Network (DMZ) with Palo Alto NVA

A perimeter network, often called a DMZ, isolates public-facing services from the internal network. Palo Alto firewalls are placed at the entry and exit points of this DMZ.

- **Example 1: Web Application DMZ** An organization hosts public-facing web servers in a DMZ subnet within a VNet. A Palo Alto firewall pair is deployed at the edge of this VNet. Incoming internet traffic first passes through the Palo Alto firewall, which performs application filtering, IPS, and advanced threat protection before allowing connections to the web servers. The web servers themselves can only initiate outbound connections to specific backend databases (in a separate internal subnet) that are also permitted by the Palo Alto firewall.
- **Hypothetical Scenario: Multi-Tier Application Security** Imagine an e-commerce platform with web servers, application servers, and database servers. The web servers are in a public-facing DMZ subnet. The application servers are in an internal application subnet, and the database servers are in a highly restricted data subnet. A Palo Alto NVA is deployed to control traffic between the internet and the DMZ, as well as between the DMZ and the application subnet, and further between the application subnet and the data subnet. This multi-layered approach ensures that each tier of the application stack is adequately protected and isolated, with granular policy enforcement at each transition point. For example, the Palo Alto firewall ensures that only web traffic (HTTP/HTTPS) reaches the web servers, only API calls reach the application servers from the web tier, and only database queries reach the database servers from the application tier.
## Network Security Groups (NSGs)

Network Security Groups (NSGs) provide a fundamental layer of security at the network interface (NIC) level or subnet level within an Azure Virtual Network. An NSG contains a list of security rules that allow or deny network traffic to or from resources. Each rule specifies a source, destination, port range, protocol, and action (Allow or Deny). When traffic flows into or out of a resource, all applicable NSG rules are evaluated in priority order.

NSGs are stateful, meaning that if an outbound flow is allowed, the return inbound flow is automatically allowed, and vice versa. They operate at Layer 4 (TCP/UDP ports) and Layer 3 (IP addresses) of the OSI model. While NSGs are powerful for basic traffic filtering, they do not offer the deep packet inspection, application-level visibility, or advanced threat protection capabilities found in NVAs like Palo Alto firewalls. Therefore, NSGs and NVAs are typically used in conjunction, with NSGs providing the initial layer of granular filtering at the subnet/NIC level, and NVAs handling more sophisticated security requirements.

### NSG Rule Evaluation

NSG rules are processed by priority, where lower numbers indicate higher priority. Once a rule matches traffic, processing stops. There are also default security rules for every NSG that cannot be removed but can be overridden by custom rules with higher priority. These default rules allow VNet-to-VNet and inbound load balancer traffic, and deny all other inbound and outbound traffic.

- **Example 1: Securing a Web Server** A web server VM in Azure needs to accept HTTP and HTTPS traffic from the internet but deny all other incoming traffic. It also needs to allow outbound connections to a backend database on a specific port. An NSG attached to the web server's NIC or subnet would have rules like:
    1. _Inbound Rule (Priority 100):_ Allow, Source: Any, Destination: Any, Port: 80, Protocol: TCP
    2. _Inbound Rule (Priority 110):_ Allow, Source: Any, Destination: Any, Port: 443, Protocol: TCP
    3. _Outbound Rule (Priority 100):_ Allow, Source: Any, Destination: `10.0.1.4` (DB IP), Port: `1433` (SQL Port), Protocol: TCP
    4. _Outbound Rule (Priority 110):_ Allow, Source: `10.0.0.0/24` (web subnet), Destination: Any, Port: Any, Protocol: Any (for general internet access if needed, placed after database rule) All other inbound traffic would be denied by the default "DenyAllInbound" rule.
- **Example 2: Isolating Subnets** Consider two subnets: `AppSubnet` (10.0.1.0/24) and `DbSubnet` (10.0.2.0/24). Applications in `AppSubnet` need to connect to databases in `DbSubnet` only on port 1433. `DbSubnet` should only accept traffic from `AppSubnet` on this port. An NSG attached to `DbSubnet` would have:
    1. _Inbound Rule (Priority 100):_ Allow, Source: `10.0.1.0/24`, Destination: Any, Port: `1433`, Protocol: TCP
    2. _Inbound Rule (Priority 110):_ Deny, Source: `VirtualNetwork` (or `10.0.0.0/8`), Destination: Any, Port: Any, Protocol: Any (to explicitly deny other VNet traffic) This ensures that only traffic from `AppSubnet` can reach the databases on the specified port, providing granular control even within the same VNet.

## Deploying Palo Alto NVAs and NSGs with Pulumi

Leveraging Pulumi, we can define and deploy both Palo Alto NVAs and NSGs as code, ensuring consistency, repeatability, and version control. This involves provisioning Azure VMs for the firewall, configuring their network interfaces and routing, and defining NSG rules.

### Provisioning Palo Alto Firewalls with Pulumi

Deploying a Palo Alto firewall typically involves several steps:

1. **Creating a Virtual Network and Subnets:** Define the VNet and subnets for the firewall (e.g., untrust, trust, management) and for the protected workloads.
2. **Creating Public IP Addresses:** For internet-facing interfaces.
3. **Deploying Virtual Machines:** Provision Azure VMs using the Palo Alto Networks image from the Azure Marketplace.
4. **Configuring Network Interfaces:** Attach multiple NICs to the firewall VMs, assigning them to the appropriate subnets.
5. **Setting up User-Defined Routes (UDRs):** Direct traffic through the firewall VMs by creating route tables and associating them with subnets.
6. **Configuring Availability Sets or Zones:** For high availability.
7. **Initial Firewall Configuration:** (Often done post-deployment via automation or manual access).

Here's a simplified Pulumi example for deploying a basic Palo Alto NVA VM and configuring routing. This example focuses on the Azure infrastructure side; the internal Palo Alto configuration (policies, zones, interfaces) would be done within the firewall OS itself or via API/automation.

``` typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as azure_native from "@pulumi/azure-native";

// Define a resource group for all resources
const resourceGroup = new azure_native.resources.ResourceGroup("rg-pulumi-nva");

// Create a Virtual Network
const vnet = new azure_native.network.VirtualNetwork("vnet-pulumi-nva", {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"],
    },
});

// Create subnets for the NVA and a protected workload
const untrustSubnet = new azure_native.network.Subnet("subnet-nva-untrust", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    addressPrefix: "10.0.0.0/24",
    // No NSG attached here initially; traffic will go through the NVA
});

const trustSubnet = new azure_native.network.Subnet("subnet-nva-trust", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    addressPrefix: "10.0.1.0/24",
});

const protectedSubnet = new azure_native.network.Subnet("subnet-protected", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    addressPrefix: "10.0.2.0/24",
});

// Create a Public IP for the untrust interface of the NVA
const nvaPublicIp = new azure_native.network.PublicIPAddress("pip-nva-untrust", {
    resourceGroupName: resourceGroup.name,
    publicIPAddressVersion: "IPv4",
    publicIPAllocationMethod: "Static",
    sku: {
        name: "Standard",
    },
});

// Create Network Interfaces for the NVA
const nvaNicUntrust = new azure_native.network.NetworkInterface("nic-nva-untrust", {
    resourceGroupName: resourceGroup.name,
    ipConfigurations: [{
        name: "ipconfig-untrust",
        subnet: {
            id: untrustSubnet.id,
        },
        publicIPAddress: {
            id: nvaPublicIp.id,
        },
        privateIPAllocationMethod: "Dynamic",
    }],
    enableIpForwarding: true, // Essential for NVAs to forward traffic
});

const nvaNicTrust = new azure_native.network.NetworkInterface("nic-nva-trust", {
    resourceGroupName: resourceGroup.name,
    ipConfigurations: [{
        name: "ipconfig-trust",
        subnet: {
            id: trustSubnet.id,
        },
        privateIPAllocationMethod: "Dynamic",
    }],
    enableIpForwarding: true, // Essential for NVAs to forward traffic
});

// Create the Palo Alto NVA Virtual Machine
// Note: You would typically get the exact image publisher, offer, sku, and version from Azure Marketplace
// for Palo Alto Networks. For this example, we'll use a placeholder and demonstrate the structure.
const nvaVm = new azure_native.compute.VirtualMachine("vm-paloalto-nva", {
    resourceGroupName: resourceGroup.name,
    hardwareProfile: {
        vmSize: "Standard_DS2_v2", // Choose an appropriate VM size for firewall performance
    },
    osProfile: {
        computerName: "paloalto-nva-01",
        adminUsername: "pulumiadmin",
        adminPassword: "Password1234!", // Use a secure password or SSH key in production
    },
    networkProfile: {
        networkInterfaces: [
            {
                id: nvaNicUntrust.id,
                primary: true, // The primary NIC
            },
            {
                id: nvaNicTrust.id,
                primary: false, // Additional NIC for trust zone
            },
        ],
    },
    storageProfile: {
        imageReference: {
            publisher: "paloaltonetworks", // Placeholder, check marketplace
            offer: "panos",               // Placeholder, check marketplace
            sku: "byol",                  // Bring Your Own License or other SKUs
            version: "latest",
        },
        osDisk: {
            createOption: "FromImage",
            managedDisk: {
                storageAccountType: "Standard_LRS",
            },
        },
    },
    location: resourceGroup.location,
    // Add licensing/bootstrapping information here as per Palo Alto requirements
});

// Configure User-Defined Routes (UDRs) to route traffic through the NVA
// Route table for the protected subnet: traffic to internet goes via NVA's trust interface
const protectedSubnetRouteTable = new azure_native.network.RouteTable("rt-protected-subnet", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    disableBgpRoutePropagation: false,
});

// Route for internet-bound traffic from protected subnet to the NVA's trust IP
const protectedSubnetRoute = new azure_native.network.Route("route-protected-to-internet-via-nva", {
    resourceGroupName: resourceGroup.name,
    routeTableName: protectedSubnetRouteTable.name,
    addressPrefix: "0.0.0.0/0", // All traffic
    nextHopType: "VirtualAppliance",
    // Get the private IP of the NVA's trust interface dynamically
    nextHopIpAddress: nvaNicTrust.ipConfigurations.apply(configs => configs![0].privateIPAddress!),
});

// Associate the route table with the protected subnet
const protectedSubnetAssociation = new azure_native.network.SubnetRouteTableAssociation("association-protected-subnet", {
    subnetId: protectedSubnet.id,
    routeTableId: protectedSubnetRouteTable.id,
});

// Output the public IP of the NVA
export const nvaPublicIpAddress = nvaPublicIp.ipAddress;
export const nvaTrustPrivateIp = nvaNicTrust.ipConfigurations.apply(configs => configs![0].privateIPAddress!);
export const nvaUntrustPrivateIp = nvaNicUntrust.ipConfigurations.apply(configs => configs![0].privateIPAddress!);

```

In the above code:

- `enableIpForwarding: true` is crucial on the NVA's network interfaces, allowing the VM to forward traffic not explicitly destined for itself.
- `nextHopType: "VirtualAppliance"` and `nextHopIpAddress` in the UDR ensure that traffic is directed to the NVA's private IP.
- The `imageReference` for Palo Alto is a placeholder. In a real scenario, you would look up the exact details from the Azure Marketplace or your Palo Alto license.

### Configuring Network Security Groups (NSGs) with Pulumi

NSGs are typically deployed to protect specific subnets or individual NICs of VMs. When using an NVA, NSGs often serve as a first line of defense _before_ traffic hits the NVA or to protect workloads _behind_ the NVA from internal threats.

Consider a scenario where the `protectedSubnet` (from the NVA example) hosts web servers, and you want to ensure that only the NVA can initiate connections to these web servers on specific ports, and that the web servers can only make outbound connections to specific backend services.

```
// ... (previous NVA deployment code) ...

// Create an NSG for the protected subnet
const protectedSubnetNsg = new azure_native.network.NetworkSecurityGroup("nsg-protected-subnet", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
});

// Inbound rule: Allow traffic from the NVA's trust interface to the protected subnet on specific ports
const allowFromNvaRule = new azure_native.network.SecurityRule("nsg-rule-allow-from-nva", {
    resourceGroupName: resourceGroup.name,
    networkSecurityGroupName: protectedSubnetNsg.name,
    priority: 100, // High priority
    direction: "Inbound",
    access: "Allow",
    protocol: "Tcp",
    sourcePortRange: "*",
    destinationPortRanges: ["80", "443"], // Web ports
    sourceAddressPrefix: nvaTrustPrivateIp, // Dynamically get the NVA's trust interface private IP
    destinationAddressPrefix: protectedSubnet.addressPrefix,
});

// Outbound rule: Allow protected subnet to talk to a backend database on port 1433
const allowToDbRule = new azure_native.network.SecurityRule("nsg-rule-allow-to-db", {
    resourceGroupName: resourceGroup.name,
    networkSecurityGroupName: protectedSubnetNsg.name,
    priority: 110, // Higher than default deny rules
    direction: "Outbound",
    access: "Allow",
    protocol: "Tcp",
    sourcePortRange: "*",
    destinationPortRange: "1433", // SQL Server port
    sourceAddressPrefix: protectedSubnet.addressPrefix,
    destinationAddressPrefix: "10.0.3.0/24", // Example DB subnet
});

// Associate the NSG with the protected subnet
const protectedSubnetNsgAssociation = new azure_native.network.SubnetNetworkSecurityGroupAssociation("association-protected-subnet-nsg", {
    subnetId: protectedSubnet.id,
    networkSecurityGroupId: protectedSubnetNsg.id,
});

// Optionally, export NSG name for reference
export const protectedNsgName = protectedSubnetNsg.name;
```

In this NSG example:

- The inbound rule dynamically references `nvaTrustPrivateIp` to ensure that only the Palo Alto NVA can initiate connections on ports 80 and 443 to resources in the `protectedSubnet`. This enforces that all internet traffic to the web servers _must_ pass through the Palo Alto firewall first.
- The outbound rule allows the protected subnet to connect to a hypothetical `10.0.3.0/24` database subnet on port 1433.


