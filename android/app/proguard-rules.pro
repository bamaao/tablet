# Medical Inventory ProGuard Rules

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# WatermelonDB
-keep class com.nozbe.watermelondb.** { *; }
-dontwarn com.nozbe.watermelondb.**

# React Native Paper
-keep class com.callstack.reactnativepaper.** { *; }

# React Native Voice
-keep class com.reactnativevoice.** { *; }

# React Native TTS
-keep class com.github.artembegual.** { *; }

# Big.js
-keep class com.tetrationnetwork.big.** { *; }

# General optimization
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep setters
-keepclassmembers class * {
    public void set*(***);
    *** get*();
}

# Keep Parcelable and CREATOR
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
