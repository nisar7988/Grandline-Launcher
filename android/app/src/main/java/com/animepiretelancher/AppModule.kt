package com.animepiretelancher

import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import android.provider.Telephony
import android.telecom.TelecomManager
import android.content.Context
import android.os.Build
import android.content.IntentFilter
import android.os.BatteryManager

class AppModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AppModule"

    private fun getIconBase64(drawable: Drawable): String {
        val bitmap = if (drawable is BitmapDrawable) {
            drawable.bitmap
        } else {
            val width = drawable.intrinsicWidth.takeIf { it > 0 } ?: 100
            val height = drawable.intrinsicHeight.takeIf { it > 0 } ?: 100

            val bmp = Bitmap.createBitmap(
                width,
                height,
                Bitmap.Config.ARGB_8888
            )

            val canvas = Canvas(bmp)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)

            bmp
        }

        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        val byteArray = stream.toByteArray()

        return Base64.encodeToString(
            byteArray,
            Base64.NO_WRAP
        )
    }

    private fun getAppData(packageName: String): WritableMap? {
        val pm = reactApplicationContext.packageManager
        return try {
            val appInfo = pm.getApplicationInfo(packageName, 0)
            val map = Arguments.createMap()
            map.putString("name", appInfo.loadLabel(pm).toString())
            map.putString("package", packageName)
            
            val drawable = appInfo.loadIcon(pm)
            val base64Icon = getIconBase64(drawable)
            map.putString("icon", "data:image/png;base64,$base64Icon")
            
            map
        } catch (e: Exception) {
            null
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        val pm = reactApplicationContext.packageManager
        val apps = pm.getInstalledApplications(0)
        val list = Arguments.createArray()

        for (app in apps) {
            // Only include apps with launch intents (actual user apps)
            if (pm.getLaunchIntentForPackage(app.packageName) != null) {
                getAppData(app.packageName)?.let {
                    list.pushMap(it)
                }
            }
        }
        promise.resolve(list)
    }

    @ReactMethod
    fun getDefaultApps(promise: Promise) {
        val pm = reactApplicationContext.packageManager
        val result = Arguments.createArray()

        fun resolveBestApp(intent: Intent): String? {
            val activities = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            if (activities.isEmpty()) return null
            
            // Try to find first that isn't from 'android' or system package
            val best = activities.find { 
                val pkg = it.activityInfo.packageName
                !pkg.equals("android", ignoreCase = true) && 
                !pkg.startsWith("com.android.internal", ignoreCase = true) &&
                !pkg.startsWith("com.android.providers", ignoreCase = true) &&
                !pkg.contains("resolver", ignoreCase = true)
            } ?: activities.firstOrNull()
            
            return best?.activityInfo?.packageName
        }

        fun resolveAndAdd(intent: Intent) {
            resolveBestApp(intent)?.let { pkg ->
                getAppData(pkg)?.let { result.pushMap(it) }
            }
        }

        // 📞 Phone
        val dialerPkg = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val telecomManager = reactApplicationContext.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            telecomManager.defaultDialerPackage
        } else {
            null
        }
        
        if (dialerPkg != null) {
            getAppData(dialerPkg)?.let { result.pushMap(it) }
        } else {
            resolveAndAdd(Intent(Intent.ACTION_DIAL))
        }

        // 💬 Messages
        val smsPkg = Telephony.Sms.getDefaultSmsPackage(reactApplicationContext)
        if (smsPkg != null) {
            getAppData(smsPkg)?.let { result.pushMap(it) }
        } else {
            resolveAndAdd(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_MESSAGING))
        }

        // 📷 Camera
        resolveAndAdd(Intent(MediaStore.ACTION_IMAGE_CAPTURE))

        // 🖼️ Gallery / Photos
        val galleryIntents = listOf(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_GALLERY),
            Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_GALLERY),
            Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        )

        var galleryPkg: String? = null
        for (gi in galleryIntents) {
            val pkg = resolveBestApp(gi)
            if (pkg != null && !pkg.equals("android", ignoreCase = true)) {
                galleryPkg = pkg
                break
            }
        }
        
        if (galleryPkg == null) {
            // Last resort fallback
            galleryPkg = resolveBestApp(Intent(Intent.ACTION_VIEW).apply { type = "image/*" })
        }

        if (galleryPkg != null) {
            getAppData(galleryPkg)?.let { result.pushMap(it) }
        } else {
            // Hard fallback for common package names if all intent logic fails
            val commonGalleryPkgs = listOf("com.oneplus.gallery", "com.google.android.apps.photos", "com.sec.android.gallery3d", "com.miui.gallery")
            for (pkg in commonGalleryPkgs) {
                try {
                    pm.getPackageInfo(pkg, 0)
                    getAppData(pkg)?.let { 
                        result.pushMap(it)
                        galleryPkg = pkg
                    }
                    if (galleryPkg != null) break
                } catch (e: Exception) {}
            }
        }

        promise.resolve(result)
    }

    @ReactMethod
    fun openApp(packageName: String) {
        val intent = reactApplicationContext.packageManager
            .getLaunchIntentForPackage(packageName)

        intent?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(it)
        }
    }

    @ReactMethod
fun setLockWallpaper(imageName: String, promise: Promise) {
    try {
        val context = reactApplicationContext
        val wallpaperManager = android.app.WallpaperManager.getInstance(context)

        val resId = context.resources.getIdentifier(
            imageName,
            "drawable",
            context.packageName
        )

        val bitmap = android.graphics.BitmapFactory.decodeResource(
            context.resources,
            resId
        )

        wallpaperManager.setBitmap(
            bitmap,
            null,
            true,
            android.app.WallpaperManager.FLAG_LOCK // 🔥 LOCK SCREEN
        )

        promise.resolve("Wallpaper set successfully")
    } catch (e: Exception) {
        promise.reject("ERROR", e.message)
    }
}
    
}