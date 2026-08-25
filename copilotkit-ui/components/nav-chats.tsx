"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
    SidebarMenuSkeleton,
    useSidebar,
} from "@/components/ui/sidebar"
import { useChats } from "@/components/chats/chats-provider"
import { toast } from "@/components/ui/toast"
import { EllipsisIcon, FolderIcon, MessageSquareIcon, Trash2Icon } from "lucide-react"

export function NavChats() {
    const { isMobile } = useSidebar()
    const { chats, deleteChat, isLoadingChats } = useChats()
    const router = useRouter()

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
            <SidebarMenu>
                {isLoadingChats && chats.length === 0 &&
                    Array.from({ length: 3 }).map((_, index) => (
                        <SidebarMenuItem key={index}>
                            <SidebarMenuSkeleton showIcon />
                        </SidebarMenuItem>
                    ))}
                {chats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton render={
                            <Link href={`/chat/${chat.id}`}>
                                <MessageSquareIcon />
                                <span>{chat.name}</span>
                            </Link>
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
                                <DropdownMenuItem onClick={() => router.push(`/chat/${chat.id}`)}>
                                    <FolderIcon />
                                    <span>Open</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                        deleteChat(chat.id).catch(() =>
                                            toast.add({ description: "Something went wrong deleting the chat", type: "error" })
                                        )
                                    }
                                >
                                    <Trash2Icon />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    )
}
