import { IconAdjustmentsHorizontal, IconApi, IconLanguage, IconSettings } from "@tabler/icons-react"
import { Link, useLocation } from "react-router"
import { i18n } from "#imports"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/base-ui/sidebar"

export function SettingsNav() {
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{i18n.t("options.sidebar.settings")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/" />} isActive={pathname === "/"}>
              <IconAdjustmentsHorizontal aria-hidden="true" />
              <span>{i18n.t("options.general.title")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/api-providers" />} isActive={pathname === "/api-providers"}>
              <IconApi aria-hidden="true" />
              <span>{i18n.t("options.apiProviders.title")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/translation" />} isActive={pathname === "/translation"}>
              <IconLanguage aria-hidden="true" />
              <span>{i18n.t("options.translation.title")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/config" />} isActive={pathname === "/config"}>
              <IconSettings aria-hidden="true" />
              <span>{i18n.t("options.config.title")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
