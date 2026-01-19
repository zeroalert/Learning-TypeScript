Azure Virtual Machines (VMs) are fundamental compute resources in Azure, providing scalable, on-demand computing power. They offer the flexibility of virtualization without the need to purchase and maintain physical hardware. Pulumi allows you to define, deploy, and manage these VMs using TypeScript, integrating them seamlessly with other Azure resources like virtual networks and storage accounts that were discussed in previous lessons.

## Understanding Azure Virtual Machines
Azure VMs are software emulations of physical computers, including a virtual processor, memory, storage, and networking interfaces. They can run various operating systems, including Windows and Linux distributions. When you deploy a VM, you are essentially provisioning compute capacity in an Azure data center.

Key components of an Azure VM include:

- **Image:** The operating system and pre-installed software template for the VM (e.g., Ubuntu Server, Windows Server 2019 Datacenter).
- **Size:** Defines the number of CPU cores, memory, and temporary storage capacity. Azure offers various VM sizes optimized for different workloads (e.g., General Purpose, Compute Optimized, Memory Optimized).
- **Disks:** Storage for the operating system, data, and temporary files. These can be managed disks (Azure handles storage accounts for you) or unmanaged disks (you manage the storage accounts). Managed disks are the modern and recommended approach.
- **Network Interface:** Connects the VM to an Azure Virtual Network (VNet), enabling communication with other resources and the internet. Each VM requires at least one network interface.
- **Virtual Network (VNet):** The logical isolation of your network in the cloud. VMs reside within subnets of a VNet.
- **Public IP Address (Optional):** Allows direct internet access to the VM. Used for SSH/RDP or hosting public-facing services.
- **Network Security Groups (NSGs):** Firewall rules that control inbound and outbound traffic to the VM's network interface or subnet.

A real-world example of using Azure VMs is running a traditional web application that requires a specific server configuration (e.g., an older version of ASP.NET on Windows Server, or a LAMP stack on Linux). Another example is hosting a database server that requires dedicated compute resources and specific storage configurations, such as a SQL Server instance that cannot easily be migrated to a platform-as-a-service offering like Azure SQL Database.

## Deploying Azure Virtual Machines with Pulumi

Deploying an Azure VM with Pulumi involves several steps, as VMs rely on other foundational Azure resources. You typically need:

1. An Azure Resource Group (covered in Module 1).
2. An Azure Virtual Network and at least one Subnet (covered in the previous lesson).
3. A Public IP Address (optional, but common for initial access).
4. A Network Interface connected to the VNet/Subnet.
5. The Virtual Machine resource itself, specifying its image, size, disks, and network interface.

Let's walk through an example to deploy a Linux (Ubuntu) VM.

### Prerequisites: Resource Group, VNet, Subnet

Before deploying a VM, ensure you have a resource group, a VNet, and a subnet. We'll reuse concepts from previous lessons.

``` typescript
import * as azure from "@pulumi/azure";
import * as azure_native from "@pulumi/azure-native";

// Configure Azure location
const location = "East US"; // Or any preferred Azure region

// 1. Create an Azure Resource Group
const resourceGroup = new azure_native.resources.ResourceGroup("vm-rg", {
    resourceGroupName: "my-pulumi-vm-rg",
    location: location,
});

// 2. Create an Azure Virtual Network
const vnet = new azure_native.network.VirtualNetwork("vm-vnet", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    virtualNetworkName: "my-pulumi-vnet",
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"],
    },
});

// 3. Create a Subnet within the Virtual Network
const subnet = new azure_native.network.Subnet("vm-subnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    subnetName: "my-pulumi-subnet",
    addressPrefix: "10.0.1.0/24",
    delegations: [], // No service delegation for a general VM subnet
});
```

### Creating a Public IP Address

To access the VM from the internet (e.g., via SSH), you'll need a Public IP Address.
``` typescript
// 4. Create a Public IP Address for the VM
const publicIp = new azure_native.network.PublicIPAddress("vm-publicip", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    publicIPAddressName: "my-pulumi-vm-publicip",
    publicIPAllocationMethod: azure_native.network.IPAllocationMethod.Dynamic, // Dynamic or Static
    sku: {
        name: azure_native.network.PublicIPAddressSkuName.Basic, // Basic or Standard
    },
});
```

### Creating a Network Security Group (NSG)
An NSG is crucial for controlling traffic to your VM. For an SSH-accessible Linux VM, you typically allow inbound traffic on port 22.
``` typescript
// 5. Create a Network Security Group (NSG) and a rule for SSH
const networkSecurityGroup = new azure_native.network.NetworkSecurityGroup("vm-nsg", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    networkSecurityGroupName: "my-pulumi-vm-nsg",
    securityRules: [{
        name: "SSH",
        priority: 1000,
        direction: azure_native.network.SecurityRuleDirection.Inbound,
        access: azure_native.network.SecurityRuleAccess.Allow,
        protocol: azure_native.network.SecurityRuleProtocol.Tcp,
        sourcePortRange: "*",
        destinationPortRange: "22", // Port for SSH
        sourceAddressPrefix: "Internet", // Allow SSH from anywhere (for demonstration)
        destinationAddressPrefix: "*",
    }],
});
```

### Creating a Public IP Address

To access the VM from the internet (e.g., via SSH), you'll need a Public IP Address.
``` typescript
// 4. Create a Public IP Address for the VM
const publicIp = new azure_native.network.PublicIPAddress("vm-publicip", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    publicIPAddressName: "my-pulumi-vm-publicip",
    publicIPAllocationMethod: azure_native.network.IPAllocationMethod.Dynamic, // Dynamic or Static
    sku: {
        name: azure_native.network.PublicIPAddressSkuName.Basic, // Basic or Standard
    },
});
```

### Creating a Network Security Group (NSG)

An NSG is crucial for controlling traffic to your VM. For an SSH-accessible Linux VM, you typically allow inbound traffic on port 22.


``` typescript
// 5. Create a Network Security Group (NSG) and a rule for SSH
const networkSecurityGroup = new azure_native.network.NetworkSecurityGroup("vm-nsg", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    networkSecurityGroupName: "my-pulumi-vm-nsg",
    securityRules: [{
        name: "SSH",
        priority: 1000,
        direction: azure_native.network.SecurityRuleDirection.Inbound,
        access: azure_native.network.SecurityRuleAccess.Allow,
        protocol: azure_native.network.SecurityRuleProtocol.Tcp,
        sourcePortRange: "*",
        destinationPortRange: "22", // Port for SSH
        sourceAddressPrefix: "Internet", // Allow SSH from anywhere (for demonstration)
        destinationAddressPrefix: "*",
    }],
});
```

### Creating a Network Interface

The VM needs a network interface to connect to the subnet and associate with the public IP and NSG.

typescript

``` typescript
// 6. Create a Network Interface Card (NIC) for the VM
const networkInterface = new azure_native.network.NetworkInterface("vm-nic", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    networkInterfaceName: "my-pulumi-vm-nic",
    ipConfigurations: [{
        name: "ipconfig1",
        subnet: {
            id: subnet.id,
        },
        privateIPAllocationMethod: azure_native.network.IPAllocationMethod.Dynamic,
        publicIPAddress: {
            id: publicIp.id,
        },
    }],
    networkSecurityGroup: {
        id: networkSecurityGroup.id,
    },
});
```



### Creating the Virtual Machine

Finally, define the VM itself, referencing the NIC, image, size, and administrator credentials.

typescript

``` typescript
// Define username and SSH public key for the VM
const adminUsername = "pulumiuser";
// IMPORTANT: Replace with your actual SSH public key, e.g., from ~/.ssh/id_rsa.pub
const sshPublicKey = "ssh-rsa AAAAB3NzaC1yc2...your-public-key-here... pulumi@example.com";

// 7. Create the Virtual Machine
const vm = new azure_native.compute.VirtualMachine("vm", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    vmName: "my-pulumi-ubuntu-vm",
    hardwareProfile: {
        vmSize: azure_native.compute.VirtualMachineSizeTypes.Standard_B1s, // Smallest size for demo
    },
    osProfile: {
        computerName: "ubuntu-vm",
        adminUsername: adminUsername,
        linuxConfiguration: {
            disablePasswordAuthentication: true, // Use SSH key for authentication
            ssh: {
                publicKeys: [{
                    path: `/home/${adminUsername}/.ssh/authorized_keys`,
                    keyData: sshPublicKey,
                }],
            },
        },
    },
    storageProfile: {
        imageReference: {
            publisher: "Canonical",
            offer: "UbuntuServer",
            sku: "18.04-LTS", // Ubuntu Server 18.04 LTS
            version: "latest",
        },
        osDisk: {
            createOption: azure_native.compute.DiskCreateOptionTypes.FromImage,
            managedDisk: {
                storageAccountType: azure_native.compute.StorageAccountTypes.Standard_LRS,
            },
            name: "myosdisk", // Name for the OS disk
        },
    },
    networkProfile: {
        networkInterfaces: [{
            id: networkInterface.id,
            primary: true,
        }],
    },
    // Optional: Add tags for better resource management
    tags: {
        environment: "dev",
        project: "pulumi-vm-demo",
    },
});

// Export the public IP address of the VM
export const publicIpAddress = publicIp.ipAddress;
export const vmName = vm.name;
```

When you run `pulumi up`, Pulumi will provision all these interconnected resources in the correct order. The `export` statement at the end allows you to easily retrieve the VM's public IP address after deployment, which is necessary to connect to it via SSH.

### Example: Windows Server VM

Deploying a Windows Server VM follows a similar pattern, with a few key differences in the `osProfile` and `imageReference`. Instead of SSH keys, you typically specify an administrator password.

``` typescript
import * as azure_native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// Assume resourceGroup, vnet, subnet, publicIp, networkSecurityGroup are defined as above
// For a Windows VM, allow RDP (port 3389) instead of SSH (port 22) in the NSG

// Update NSG for RDP access for Windows VM
const networkSecurityGroupWindows = new azure_native.network.NetworkSecurityGroup("vm-nsg-windows", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    networkSecurityGroupName: "my-pulumi-vm-nsg-windows",
    securityRules: [{
        name: "RDP",
        priority: 1000,
        direction: azure_native.network.SecurityRuleDirection.Inbound,
        access: azure_native.network.SecurityRuleAccess.Allow,
        protocol: azure_native.network.SecurityRuleProtocol.Tcp,
        sourcePortRange: "*",
        destinationPortRange: "3389", // Port for RDP
        sourceAddressPrefix: "Internet",
        destinationAddressPrefix: "*",
    }],
});

// Network Interface for Windows VM, referencing the Windows-specific NSG
const networkInterfaceWindows = new azure_native.network.NetworkInterface("vm-nic-windows", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    networkInterfaceName: "my-pulumi-vm-nic-windows",
    ipConfigurations: [{
        name: "ipconfig1",
        subnet: {
            id: subnet.id,
        },
        privateIPAllocationMethod: azure_native.network.IPAllocationMethod.Dynamic,
        publicIPAddress: {
            id: publicIp.id, // Reuse the same public IP for demonstration or create a new one
        },
    }],
    networkSecurityGroup: {
        id: networkSecurityGroupWindows.id,
    },
});

// Define administrator username and password for the Windows VM
const adminUsernameWindows = "pulumiadmin";
// IMPORTANT: Use a strong password and manage it securely, e.g., with Pulumi Config secrets
const adminPasswordWindows = new pulumi.Config().requireSecret("windowsAdminPassword"); 

// Create the Windows Virtual Machine
const windowsVm = new azure_native.compute.VirtualMachine("windows-vm", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    vmName: "my-pulumi-windows-vm",
    hardwareProfile: {
        vmSize: azure_native.compute.VirtualMachineSizeTypes.Standard_B1s,
    },
    osProfile: {
        computerName: "windows-vm",
        adminUsername: adminUsernameWindows,
        adminPassword: adminPasswordWindows, // Use a strong, secure password
        windowsConfiguration: {
            provisionVMAgent: true, // Recommended for Windows VMs
        },
    },
    storageProfile: {
        imageReference: {
            publisher: "MicrosoftWindowsServer",
            offer: "WindowsServer",
            sku: "2019-Datacenter", // Windows Server 2019 Datacenter
            version: "latest",
        },
        osDisk: {
            createOption: azure_native.compute.DiskCreateOptionTypes.FromImage,
            managedDisk: {
                storageAccountType: azure_native.compute.StorageAccountTypes.Standard_LRS,
            },
            name: "mywindowsosdisk",
        },
    },
    networkProfile: {
        networkInterfaces: [{
            id: networkInterfaceWindows.id,
            primary: true,
        }],
    },
    tags: {
        environment: "dev",
        project: "pulumi-windows-vm-demo",
    },
});

// Export the public IP address
export const windowsVmPublicIp = publicIp.ipAddress;
export const windowsVmName = windowsVm.name;
```

Notice the use of `new pulumi.Config().requireSecret("windowsAdminPassword")` for the administrator password. This demonstrates how to securely manage sensitive information, a topic that will be covered in more detail in Module 4. For now, understand that secrets should not be hardcoded directly in your Pulumi program.

## Managing VM State and Updates

Pulumi allows you to manage the lifecycle of your VMs, including updates, scaling, and deletion.

### Updating VM Properties

To update a VM's properties (e.g., changing its size, attaching a new data disk, or updating NSG rules), you simply modify the Pulumi program and run `pulumi up` again. Pulumi will compute the differences and apply the necessary changes. For example, to change the Ubuntu VM's size:

``` typescript
// ... (previous resources) ...

const vm = new azure_native.compute.VirtualMachine("vm", {
    // ... other properties ...
    hardwareProfile: {
        vmSize: azure_native.compute.VirtualMachineSizeTypes.Standard_D2s_v3, // Change to a larger size
    },
    // ... other properties ...
});
```
Running `pulumi up` after this change would trigger an update operation on the existing VM, potentially requiring a reboot depending on the change.

### Adding Data Disks

VMs often require additional data disks beyond the OS disk. You can attach managed data disks to your VM.

``` typescript
// Create a new data disk
const dataDisk = new azure_native.compute.Disk("vm-datadisk", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    diskName: "my-pulumi-datadisk",
    creationData: {
        createOption: azure_native.compute.DiskCreateOptionTypes.Empty,
    },
    diskSizeGB: 30, // 30 GB disk
    sku: {
        name: azure_native.compute.DiskSkuName.Standard_LRS,
    },
});

// Update the VM to include the data disk
const vmWithDataDisk = new azure_native.compute.VirtualMachine("vm", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    vmName: "my-pulumi-ubuntu-vm",
    hardwareProfile: {
        vmSize: azure_native.compute.VirtualMachineSizeTypes.Standard_B1s,
    },
    osProfile: { /* ... */ },
    storageProfile: {
        imageReference: { /* ... */ },
        osDisk: { /* ... */ },
        dataDisks: [{
            lun: 0, // Logical Unit Number, must be unique for each disk
            createOption: azure_native.compute.DiskCreateOptionTypes.Attach,
            managedDisk: {
                id: dataDisk.id,
            },
            diskSizeGB: dataDisk.diskSizeGB, // Optionally specify size again for clarity
        }],
    },
    networkProfile: { /* ... */ },
    tags: { /* ... */ },
});
```
After deploying, you would need to connect to the VM (via SSH for Linux or RDP for Windows) and format/mount the new data disk within the operating system. Pulumi provisions the disk and attaches it, but OS-level operations are still manual or can be automated via extensions.

### Deleting VMs

To delete a VM and its associated resources, simply remove the resource definitions from your Pulumi program or remove the entire stack using `pulumi destroy`. Pulumi handles the dependency order, ensuring that resources like the VM, NIC, Public IP, and NSG are deleted correctly.

## Practical Examples and Demonstrations

Let's combine the concepts to deploy a complete, functional web server on an Azure VM using Pulumi. We'll deploy an Ubuntu VM and automatically install Nginx web server using a custom data script.


### Installing Nginx on an Ubuntu VM with Custom Data

Azure VMs support _custom data_ (also known as _cloud-init_ for Linux VMs) which allows you to pass a script to the VM during provisioning. This script executes the first time the VM boots, enabling automation of initial setup tasks like installing software or configuring users.

``` typescript
import * as azure_native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

const location = "East US";

const resourceGroup = new azure_native.resources.ResourceGroup("nginx-vm-rg", {
    resourceGroupName: "nginx-web-server-rg",
    location: location,
});

const vnet = new azure_native.network.VirtualNetwork("nginx-vm-vnet", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    virtualNetworkName: "nginx-web-server-vnet",
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"],
    },
});

const subnet = new azure_native.network.Subnet("nginx-vm-subnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    subnetName: "nginx-web-server-subnet",
    addressPrefix: "10.0.1.0/24",
});

const publicIp = new azure_native.network.PublicIPAddress("nginx-vm-publicip", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    publicIPAddressName: "nginx-web-server-publicip",
    publicIPAllocationMethod: azure_native.network.IPAllocationMethod.Dynamic,
    sku: {
        name: azure_native.network.PublicIPAddressSkuName.Basic,
    },
});

// NSG for Nginx: Allow SSH (22) and HTTP (80)
const networkSecurityGroup = new azure_native.network.NetworkSecurityGroup("nginx-vm-nsg", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    networkSecurityGroupName: "nginx-web-server-nsg",
    securityRules: [
        {
            name: "SSH",
            priority: 1000,
            direction: azure_native.network.SecurityRuleDirection.Inbound,
            access: azure_native.network.SecurityRuleAccess.Allow,
            protocol: azure_native.network.SecurityRuleProtocol.Tcp,
            sourcePortRange: "*",
            destinationPortRange: "22",
            sourceAddressPrefix: "Internet",
            destinationAddressPrefix: "*",
        },
        {
            name: "HTTP",
            priority: 1001,
            direction: azure_native.network.SecurityRuleDirection.Inbound,
            access: azure_native.network.SecurityRuleAccess.Allow,
            protocol: azure_native.network.SecurityRuleProtocol.Tcp,
            sourcePortRange: "*",
            destinationPortRange: "80", // Allow HTTP traffic
            sourceAddressPrefix: "Internet",
            destinationAddressPrefix: "*",
        },
    ],
});

const networkInterface = new azure_native.network.NetworkInterface("nginx-vm-nic", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    networkInterfaceName: "nginx-web-server-nic",
    ipConfigurations: [{
        name: "ipconfig1",
        subnet: {
            id: subnet.id,
        },
        privateIPAllocationMethod: azure_native.network.IPAllocationMethod.Dynamic,
        publicIPAddress: {
            id: publicIp.id,
        },
    }],
    networkSecurityGroup: {
        id: networkSecurityGroup.id,
    },
});

const adminUsername = "pulumiuser";
const sshPublicKey = new pulumi.Config().requireSecret("sshPublicKey"); // Load from Pulumi config secret

// Cloud-init script to install Nginx
const cloudInitScript = `
#!/bin/bash
sudo apt update -y
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
echo "<h1>Hello from Pulumi Nginx VM!</h1>" | sudo tee /var/www/html/index.nginx-debian.html
`;

const vm = new azure_native.compute.VirtualMachine("nginx-vm", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    vmName: "nginx-web-server-vm",
    hardwareProfile: {
        vmSize: azure_native.compute.VirtualMachineSizeTypes.Standard_B1s,
    },
    osProfile: {
        computerName: "nginx-web-server",
        adminUsername: adminUsername,
        linuxConfiguration: {
            disablePasswordAuthentication: true,
            ssh: {
                publicKeys: [{
                    path: `/home/${adminUsername}/.ssh/authorized_keys`,
                    keyData: sshPublicKey,
                }],
            },
        },
        customData: Buffer.from(cloudInitScript).toString("base64"), // Base64 encode the script
    },
    storageProfile: {
        imageReference: {
            publisher: "Canonical",
            offer: "UbuntuServer",
            sku: "18.04-LTS",
            version: "latest",
        },
        osDisk: {
            createOption: azure_native.compute.DiskCreateOptionTypes.FromImage,
            managedDisk: {
                storageAccountType: azure_native.compute.DiskSkuName.Standard_LRS,
            },
            name: "nginxosdisk",
        },
    },
    networkProfile: {
        networkInterfaces: [{
            id: networkInterface.id,
            primary: true,
        }],
    },
    tags: {
        environment: "web",
        application: "nginx-server",
    },
});

export const publicIpAddress = publicIp.ipAddress;
export const vmName = vm.name;
```

