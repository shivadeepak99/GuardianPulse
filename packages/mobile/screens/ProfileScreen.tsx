import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  privacyLevel: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Error", "Please log in again");
        return;
      }

      const response = await fetch("http://localhost:8080/api/v1/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem("authToken");
        Alert.alert("Session Expired", "Please log in again");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.data);
        setProfileForm({
          firstName: data.data.firstName || "",
          lastName: data.data.lastName || "",
          phoneNumber: data.data.phoneNumber || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    setProfileLoading(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch("http://localhost:8080/api/v1/users/me", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        Alert.alert("Error", data.message || "Failed to update profile");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while updating profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    // Client-side validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert("Error", "New password and confirmation do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      Alert.alert("Error", "New password must be at least 8 characters long");
      return;
    }

    setPasswordLoading(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(
        "http://localhost:8080/api/v1/users/me/password",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(passwordForm),
        },
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Password changed successfully!");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        Alert.alert("Error", data.message || "Failed to change password");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while changing password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile Settings</Text>
      </View>

      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]?.toUpperCase() ||
              user?.email?.[0]?.toUpperCase() ||
              "U"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user?.firstName || user?.lastName
              ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
              : "User"}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.memberSince}>
            Member since{" "}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : ""}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "profile" && styles.activeTab]}
          onPress={() => setActiveTab("profile")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "profile" && styles.activeTabText,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "password" && styles.activeTab]}
          onPress={() => setActiveTab("password")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "password" && styles.activeTabText,
            ]}
          >
            Password
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <Text style={styles.sectionSubtitle}>
            Update your personal information and contact details.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={profileForm.firstName}
              onChangeText={(text) =>
                setProfileForm({ ...profileForm, firstName: text })
              }
              placeholder="Enter your first name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={profileForm.lastName}
              onChangeText={(text) =>
                setProfileForm({ ...profileForm, lastName: text })
              }
              placeholder="Enter your last name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={profileForm.phoneNumber}
              onChangeText={(text) =>
                setProfileForm({ ...profileForm, phoneNumber: text })
              }
              placeholder="+1234567890"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            <Text style={styles.helpText}>
              Used for SMS alerts. Include country code (e.g., +1 for US).
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.email || ""}
              editable={false}
            />
            <Text style={styles.helpText}>
              Email address cannot be changed. Contact support if needed.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, profileLoading && styles.disabledButton]}
            onPress={handleProfileSubmit}
            disabled={profileLoading}
          >
            {profileLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Password Tab */}
      {activeTab === "password" && (
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.sectionSubtitle}>
            Ensure your account security by using a strong password.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.currentPassword}
              onChangeText={(text) =>
                setPasswordForm({ ...passwordForm, currentPassword: text })
              }
              placeholder="Enter your current password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.newPassword}
              onChangeText={(text) =>
                setPasswordForm({ ...passwordForm, newPassword: text })
              }
              placeholder="Enter your new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
            <Text style={styles.helpText}>
              Must be at least 8 characters long.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.confirmPassword}
              onChangeText={(text) =>
                setPasswordForm({ ...passwordForm, confirmPassword: text })
              }
              placeholder="Confirm your new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, passwordLoading && styles.disabledButton]}
            onPress={handlePasswordSubmit}
            disabled={passwordLoading}
          >
            {passwordLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  userCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6366F1",
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  userEmail: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 2,
  },
  memberSince: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  activeTab: {
    backgroundColor: "#6366F1",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#fff",
  },
  formContainer: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  disabledInput: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },
  helpText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;
