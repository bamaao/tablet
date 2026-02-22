/**
 * SettingsScreen Component
 *
 * Settings and configuration screen for the application.
 */

import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {
  Text,
  Divider,
  List,
  Switch,
  useTheme,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();

  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [autoSync, setAutoSync] = React.useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          设置
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Voice Settings */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          语音设置
        </Text>
        <List.Item
          title="启用语音识别"
          description="允许通过语音命令进行操作"
          right={() => (
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              color={theme.colors.primary}
            />
          )}
        />
        <List.Item
          title="语音反馈"
          description="操作完成后播放语音提示"
          right={() => (
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              color={theme.colors.primary}
            />
          )}
        />

        <Divider style={styles.divider} />

        {/* Data Settings */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          数据设置
        </Text>
        <List.Item
          title="自动同步"
          description="自动将数据同步到服务器"
          right={() => (
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              color={theme.colors.primary}
            />
          )}
        />
        <List.Item
          title="导出数据"
          description="导出库存数据为Excel文件"
          left={props => <List.Icon {...props} icon="file-excel" />}
          onPress={() => {
            // TODO: Implement export
          }}
        />
        <List.Item
          title="清空本地数据"
          description="删除所有本地数据（不可恢复）"
          left={props => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
          onPress={() => {
            // TODO: Implement clear data
          }}
        />

        <Divider style={styles.divider} />

        {/* About */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          关于
        </Text>
        <List.Item
          title="版本"
          description="1.0.0"
          left={props => <List.Icon {...props} icon="information" />}
        />
        <List.Item
          title="帮助"
          description="使用说明和常见问题"
          left={props => <List.Icon {...props} icon="help-circle" />}
          onPress={() => {
            // TODO: Implement help
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#666',
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
  },
});
