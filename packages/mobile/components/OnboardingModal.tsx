import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { guardianAPI } from "../services/api";

const { width, height } = Dimensions.get("window");

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
  userEmail?: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  onComplete,
  userEmail,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [guardianEmail, setGuardianEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInviteGuardian = async () => {
    if (!guardianEmail.trim()) {
      Alert.alert("Error", "Please enter a guardian email address");
      return;
    }

    if (guardianEmail.toLowerCase() === userEmail?.toLowerCase()) {
      Alert.alert("Error", "You cannot invite yourself as a guardian");
      return;
    }

    setLoading(true);
    try {
      const response = await guardianAPI.inviteGuardian({
        inviteeEmail: guardianEmail.trim(),
        message: inviteMessage.trim() || undefined,
      });

      if (response.success) {
        Alert.alert(
          "Invitation Sent!",
          `Guardian invitation has been sent to ${guardianEmail}. They will receive an email with instructions to accept your invitation.`,
          [
            {
              text: "OK",
              onPress: () => {
                setGuardianEmail("");
                setInviteMessage("");
                onComplete();
              },
            },
          ],
        );
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to send invitation. Please try again.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Guardian Invitation?",
      "You can always invite guardians later from the app settings. Are you sure you want to skip this step?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Skip", onPress: onComplete },
      ],
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.emoji}>🛡️</Text>
            <Text style={styles.stepTitle}>Welcome to GuardianPulse</Text>
            <Text style={styles.stepDescription}>
              Your silent protector in times of need. GuardianPulse keeps you
              connected to the people who care about your safety.
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Silent emergency alerts</Text>
              <Text style={styles.featureItem}>
                • Real-time location sharing
              </Text>
              <Text style={styles.featureItem}>• Audio evidence recording</Text>
              <Text style={styles.featureItem}>• Trusted guardian network</Text>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.emoji}>👥</Text>
            <Text style={styles.stepTitle}>Invite People You Trust</Text>
            <Text style={styles.stepDescription}>
              Guardians are trusted individuals who can monitor your safety and
              respond to emergencies. They could be family members, close
              friends, or security personnel.
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>
                • Receive your emergency alerts
              </Text>
              <Text style={styles.featureItem}>
                • Monitor your location during live sessions
              </Text>
              <Text style={styles.featureItem}>
                • Access audio evidence when needed
              </Text>
              <Text style={styles.featureItem}>
                • Take action in emergency situations
              </Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.emoji}>📧</Text>
            <Text style={styles.stepTitle}>Invite Your First Guardian</Text>
            <Text style={styles.stepDescription}>
              Let's start building your safety network. Invite someone you trust
              to be your first guardian.
            </Text>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Guardian Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="guardian@example.com"
                placeholderTextColor="#9CA3AF"
                value={guardianEmail}
                onChangeText={setGuardianEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Personal Message (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Hi! I'd like you to be my safety guardian on GuardianPulse..."
                placeholderTextColor="#9CA3AF"
                value={inviteMessage}
                onChangeText={setInviteMessage}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.helpText}>
                Your guardian will receive an email invitation with instructions
                to set up their account.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Getting Started</Text>
          <Text style={styles.stepIndicator}>
            {currentStep} of {totalSteps}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${(currentStep / totalSteps) * 100}%` },
            ]}
          />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep < totalSteps ? (
            <View style={styles.navigationButtons}>
              {currentStep > 1 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handlePrevious}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              <View style={styles.rightButtons}>
                {currentStep === totalSteps && (
                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                  >
                    <Text style={styles.skipButtonText}>Skip for now</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={
                    currentStep === totalSteps
                      ? handleInviteGuardian
                      : handleNext
                  }
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.nextButtonText}>
                      {currentStep === totalSteps ? "Send Invitation" : "Next"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={onComplete}
            >
              <Text style={styles.completeButtonText}>Complete Setup</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  stepIndicator: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  progressContainer: {
    height: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 24,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: {
    alignSelf: "stretch",
  },
  featureItem: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 8,
    lineHeight: 24,
  },
  formContainer: {
    alignSelf: "stretch",
    marginTop: 16,
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
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  helpText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  navigation: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  nextButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default OnboardingModal;
