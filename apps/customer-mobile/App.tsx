import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import OtpScreen from './src/screens/OtpScreen';
import HomeScreen from './src/screens/HomeScreen';
import VendorsScreen from './src/screens/VendorsScreen';
import VendorMenuScreen from './src/screens/VendorMenuScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';

export type RootStackParamList = {
  Login: undefined;
  Otp: { phone: string };
  Home: undefined;
  Vendors: { service: string; serviceName: string };
  VendorMenu: { vendorId: string; vendorName: string };
  Orders: undefined;
  OrderDetail: { orderId: string };
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Root() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#00A86B' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '600' } }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Verify your number' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Besonc' }} />
          <Stack.Screen name="Vendors" component={VendorsScreen} options={({ route }) => ({ title: route.params.serviceName })} />
          <Stack.Screen name="VendorMenu" component={VendorMenuScreen} options={({ route }) => ({ title: route.params.vendorName })} />
          <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Your orders' }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
