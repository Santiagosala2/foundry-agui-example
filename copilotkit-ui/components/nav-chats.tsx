"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { EllipseIcon, EllipsisIcon, FolderIcon, LucideIcon, ShareIcon, Trash2Icon } from "lucide-react"

export function NavChats({
    items,
}: {
    items: {
        name: string
        url: string
        icon: LucideIcon
    }[]
}) {
    const { isMobile } = useSidebar()

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton render={
                            <a href={item.url}>
                                <item.icon />
                                <span>{item.name}</span>
                            </a>
                        }>
                        </SidebarMenuButton>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={
                                <SidebarMenuAction
                                    showOnHover
                                    className="rounded-sm data-[state=open]:bg-accent"
                                >
                                    <EllipsisIcon className="text-sidebar-foreground/70" />
                                    <span className="sr-only">More</span>
                                </SidebarMenuAction>

                            }>

                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-24 rounded-lg"
                                side={isMobile ? "bottom" : "right"}
                                align={isMobile ? "end" : "start"}
                            >
                                <DropdownMenuItem>
                                    <FolderIcon />
                                    <span>Open</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive">
                                    <Trash2Icon />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                    <SidebarMenuButton className="text-sidebar-foreground/70">
                        <EllipsisIcon className="text-sidebar-foreground/70" />
                        <span>More</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
