/**
 * useVoiceCommand Hook
 *
 * Connects voice recognition to Redux state and action dispatching.
 * Handles parsing voice commands and executing corresponding actions.
 */

import {useEffect, useCallback, useRef} from 'react';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {
  startListening,
  stopListening,
  updateTranscript,
  setCommand,
  clearCommand,
  setError,
} from '@/store/slices/voiceSlice';
import {
  setMode,
  selectMedicine,
  executeTransaction,
} from '@/store/slices/inventorySlice';
import {
  selectPrescription,
  setDosageCount,
  checkPrescriptionAvailability,
} from '@/store/slices/prescriptionSlice';
import {parseVoiceCommand, formatCommandForConfirmation} from '@/utils/voice/CommandParser';
import {TransactionType, InventoryMode} from '@/types';
import {TTSService} from '@/services/TTSService';
import {showToast} from '@/store/slices/uiSlice';
import {searchMedicines} from '@/store/slices/inventorySlice';

export interface UseVoiceCommandOptions {
  /**
   * Enable voice command execution
   */
  enabled?: boolean;

  /**
   * Speak confirmations after successful operations
   */
  speakConfirmations?: boolean;

  /**
   * Callback when command is recognized
   */
  onCommandRecognized?: (command: any) => void;

  /**
   * Callback when command is executed
   */
  onCommandExecuted?: (success: boolean, error?: string) => void;
}

export function useVoiceCommand(options: UseVoiceCommandOptions = {}) {
  const {
    enabled = true,
    speakConfirmations = true,
    onCommandRecognized,
    onCommandExecuted,
  } = options;

  const dispatch = useAppDispatch();
  const isListening = useAppSelector(selectIsListening);
  const lastCommand = useAppSelector(selectLastCommand);
  const medicines = useAppSelector(selectMedicines);
  const prescriptions = useAppSelector(selectPrescriptions);

  const processingRef = useRef(false);

  // Process recognized voice text
  const processVoiceInput = useCallback(
    async (text: string) => {
      if (!enabled || processingRef.current) {
        return;
      }

      processingRef.current = true;

      try {
        // Parse the command
        const result = parseVoiceCommand(text);

        if (!result.success || !result.command) {
          dispatch(setError(result.error || '无法识别命令'));
          if (speakConfirmations) {
            await TTSService.speakError('无法识别命令，请重试');
          }
          onCommandExecuted?.(false, result.error);
          return;
        }

        const command = result.command;
        dispatch(setCommand(command));
        onCommandRecognized?.(command);

        // Execute the command based on its type
        let success = false;
        let errorMessage: string | undefined;

        switch (command.action) {
          case 'INBOUND':
          case 'OUTBOUND':
          case 'AUDIT':
            // Handle stock transactions
            success = await handleStockTransaction(command);
            break;

          case 'UNPACK':
            // Handle unpack operation
            success = await handleUnpackCommand(command);
            break;

          case 'PRESCRIPTION':
            // Handle prescription dispensing
            success = await handlePrescriptionCommand(command);
            break;

          default:
            errorMessage = '未知命令类型';
            dispatch(setError(errorMessage));
            if (speakConfirmations) {
              await TTSService.speakError(errorMessage);
            }
        }

        onCommandExecuted?.(success, errorMessage);
      } catch (error) {
        const errorMessage = (error as Error).message;
        dispatch(setError(errorMessage));
        if (speakConfirmations) {
          await TTSService.speakError(errorMessage);
        }
        onCommandExecuted?.(false, errorMessage);
      } finally {
        processingRef.current = false;
      }
    },
    [enabled, medicines, prescriptions, dispatch, speakConfirmations],
  );

  // Handle stock transaction commands (INBOUND, OUTBOUND, AUDIT)
  const handleStockTransaction = async (command: any): Promise<boolean> => {
    if (!command.medicine || !command.quantity || !command.unit) {
      return false;
    }

    // Search for the medicine
    const medicine = medicines.find(m => m.name === command.medicine);
    if (!medicine) {
      const errorMessage = `找不到药品：${command.medicine}`;
      dispatch(setError(errorMessage));
      if (speakConfirmations) {
        await TTSService.speakError(errorMessage);
      }
      return false;
    }

    // Check stock availability for outbound
    if (command.action === 'OUTBOUND') {
      const required = command.quantity;
      if (medicine.currentStock < required) {
        const errorMessage = `${medicine.name}库存不足`;
        dispatch(setError(errorMessage));
        if (speakConfirmations) {
          await TTSService.speakError(errorMessage);
        }
        return false;
      }
    }

    try {
      // Set the correct mode
      const modeMap: Record<string, InventoryMode> = {
        INBOUND: InventoryMode.INBOUND,
        OUTBOUND: InventoryMode.OUTBOUND,
        AUDIT: InventoryMode.AUDIT,
      };
      dispatch(setMode(modeMap[command.action]));
      dispatch(selectMedicine(medicine));

      // Execute the transaction
      await dispatch(
        executeTransaction({
          medicineId: medicine.id,
          type: command.action as TransactionType,
          quantity: command.quantity,
          unit: command.unit,
          notes: `语音命令: ${command.rawText}`,
        }),
      ).unwrap();

      // Success feedback
      const confirmation = formatCommandForConfirmation(command);
      dispatch(showToast(confirmation));
      if (speakConfirmations) {
        if (command.action === 'INBOUND') {
          await TTSService.speakInboundConfirmation(
            medicine.name,
            command.quantity,
            command.unit,
          );
        } else if (command.action === 'OUTBOUND') {
          await TTSService.speakOutboundConfirmation(
            medicine.name,
            command.quantity,
            command.unit,
          );
        } else if (command.action === 'AUDIT') {
          await TTSService.speakAuditResult(
            medicine.name,
            command.quantity - medicine.currentStock,
            command.unit,
          );
        }
      }

      return true;
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch(setError(errorMessage));
      if (speakConfirmations) {
        await TTSService.speakError(errorMessage);
      }
      return false;
    }
  };

  // Handle unpack commands
  const handleUnpackCommand = async (command: any): Promise<boolean> => {
    if (!command.medicine || !command.quantity) {
      return false;
    }

    const medicine = medicines.find(m => m.name === command.medicine);
    if (!medicine) {
      const errorMessage = `找不到药品：${command.medicine}`;
      dispatch(setError(errorMessage));
      if (speakConfirmations) {
        await TTSService.speakError(errorMessage);
      }
      return false;
    }

    try {
      dispatch(setMode(InventoryMode.UNPACK));
      dispatch(selectMedicine(medicine));

      await dispatch(
        executeTransaction({
          medicineId: medicine.id,
          type: TransactionType.UNPACK,
          quantity: command.quantity,
          unit: '包',
          notes: `语音命令: ${command.rawText}`,
        }),
      ).unwrap();

      const confirmation = `已拆包${medicine.name}${command.quantity}包`;
      dispatch(showToast(confirmation));
      if (speakConfirmations) {
        await TTSService.speakUnpackConfirmation(
          medicine.name,
          command.quantity,
          command.quantity * medicine.packageSize + medicine.looseStock,
          medicine.baseUnit,
        );
      }

      return true;
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch(setError(errorMessage));
      if (speakConfirmations) {
        await TTSService.speakError(errorMessage);
      }
      return false;
    }
  };

  // Handle prescription commands
  const handlePrescriptionCommand = async (command: any): Promise<boolean> => {
    if (!command.prescriptionName || !command.dosageCount) {
      return false;
    }

    const prescription = prescriptions.find(
      p => p.name === command.prescriptionName,
    );
    if (!prescription) {
      const errorMessage = `找不到处方：${command.prescriptionName}`;
      dispatch(setError(errorMessage));
      if (speakConfirmations) {
        await TTSService.speakError(errorMessage);
      }
      return false;
    }

    try {
      dispatch(selectPrescription(prescription));
      dispatch(setDosageCount(command.dosageCount));

      // Check availability
      await dispatch(
        checkPrescriptionAvailability({
          prescriptionId: prescription.id,
          dosageCount: command.dosageCount,
        }),
      ).unwrap();

      const confirmation = `按${prescription.name}抓${command.dosageCount}付`;
      dispatch(showToast(confirmation));
      if (speakConfirmations) {
        await TTSService.speakPrescriptionConfirmation(
          prescription.name,
          command.dosageCount,
        );
      }

      return true;
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch(setError(errorMessage));
      if (speakConfirmations) {
        await TTSService.speakError(errorMessage);
      }
      return false;
    }
  };

  return {
    isListening,
    lastCommand,
    processVoiceInput,
    clearLastCommand: () => dispatch(clearCommand()),
  };
}

const selectIsListening = (state: {voice: {isListening: boolean}}) => state.voice.isListening;
const selectLastCommand = (state: {voice: {lastCommand?: any}}) => state.voice.lastCommand;
const selectMedicines = (state: {inventory: {medicines: any[]}}) => state.inventory.medicines;
const selectPrescriptions = (state: {prescription: {prescriptions: any[]}}) =>
  state.prescription.prescriptions;
