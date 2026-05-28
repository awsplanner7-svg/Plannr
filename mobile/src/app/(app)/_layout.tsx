import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Home, Clock, Bell, User } from "lucide-react-native";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#1a1a1a",
        tabBarInactiveTintColor: "#AAAAAA",
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Boards",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="create-board" options={{ href: null }} />
      <Tabs.Screen name="board/[id]" options={{ href: null }} />
      <Tabs.Screen name="board/[id]/add-suggestion" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    paddingTop: 8,
    height: 80,
  },
  tabBarLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
});
