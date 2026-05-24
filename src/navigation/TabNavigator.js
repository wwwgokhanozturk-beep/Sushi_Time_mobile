import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../core/theme';
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import { useCartStore, selectTotalItems } from '../store/cartStore';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home:    { active: 'home',              inactive: 'home-outline' },
  Menu:    { active: 'restaurant',        inactive: 'restaurant-outline' },
  Orders:  { active: 'document-text',     inactive: 'document-text-outline' },
  Cart:    { active: 'cart',              inactive: 'cart-outline' },
  Chat:    { active: 'chatbubbles',       inactive: 'chatbubbles-outline' },
  Profile: { active: 'person-circle',     inactive: 'person-circle-outline' },
};

function TabIcon({ name, focused, color }) {
  const icon = TAB_ICONS[name] || { active: 'ellipse', inactive: 'ellipse-outline' };
  return (
    <Ionicons
      name={focused ? icon.active : icon.inactive}
      size={24}
      color={color}
    />
  );
}

function CartIcon({ focused, color }) {
  const totalItems = useCartStore(selectTotalItems);
  return (
    <View>
      <Ionicons
        name={focused ? 'cart' : 'cart-outline'}
        size={24}
        color={color}
      />
      {totalItems > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
        </View>
      )}
    </View>
  );
}

export function TabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10) + 16;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderTopColor: Colors.divider,
          borderTopWidth: 1,
          elevation: 0,
          paddingTop: Spacing.xs,
          height: 54 + bottomPad,
          paddingBottom: bottomPad,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="Home" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarLabel: t('menu'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="Menu" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrderHistoryScreen}
        options={{
          tabBarLabel: t('orders'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="Orders" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: t('cart'),
          tabBarIcon: ({ focused, color }) => <CartIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused, color }) => <TabIcon name="Chat" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="Profile" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
});
