  const admin = require('firebase-admin');
const User = require('../models/User');
const SafeZone = require('../models/SafeZone');

// Initialize Firebase Admin (requires GOOGLE_APPLICATION_CREDENTIALS or a valid serviceAccount key)
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized successfully.");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
          credential: admin.credential.applicationDefault()
      });
      console.log("Firebase Admin Initialized with Default Credentials.");
  } else {
    admin.initializeApp();
  }
} catch (e) {
  console.warn("WARN: Firebase admin failed to initialize.", e.message);
}

class FCMService {
  /**
   * Identifies users within the danger radius, finds their closest safe zone, and sends a push alert.
   * @param {Object} threatData 
   * @param {Array<Number>} epicenter [longitude, latitude]
   * @param {Number} radiusKm 
   */
  async broadcastAlert(threatData, epicenter, radiusKm = 10) {
    try {
      console.log(`[FCM] Broadcasting ${threatData.risk_level} alert for ${threatData.threat_type} within ${radiusKm}km`);
      
      const radiusInRadians = radiusKm / 6378.1;

      // 1. Find Users within the 10km radius of the threat epicenter
      const usersInDanger = await User.find({
        location: {
          $geoWithin: {
            $centerSphere: [epicenter, radiusInRadians]
          }
        }
      });

      if (usersInDanger.length === 0) {
        console.log("No users found in the 10km radius.");
        return 0;
      }

      console.log(`Found ${usersInDanger.length} users in danger zone. Formatting payloads...`);

      const messages = [];

      // 2. For each user, find their closest safe zone
      for (const user of usersInDanger) {
        if (!user.fcmToken) continue;

        const userLocation = user.location.coordinates;

        // Geospatial $near query to find closest safe zone
        const nearestSafeZone = await SafeZone.findOne({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: userLocation
              }
            }
          },
          status: 'OPEN'
        });

        const safeZonePayload = nearestSafeZone ? {
          safeZoneName: nearestSafeZone.name,
          safeZoneLat: nearestSafeZone.location.coordinates[1].toString(),
          safeZoneLng: nearestSafeZone.location.coordinates[0].toString()
        } : {
          safeZoneName: "UNKNOWN",
          safeZoneLat: "",
          safeZoneLng: ""
        };

        const message = {
          data: {
            title: `URGENT: ${threatData.threat_type} WARNING 🚨`,
            message: `${threatData.suggested_action}. Proceed to nearest safe zone immediately.`,
            risk_level: threatData.risk_level,
            threat_type: threatData.threat_type,
            ...safeZonePayload,
            type: "EVACUATION_OVERLAY"
          },
          android: {
            priority: 'high'
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: `URGENT: ${threatData.threat_type} WARNING 🚨`,
                  body: `${threatData.suggested_action}. Proceed to nearest safe zone immediately.`
                },
                sound: 'default',
                'content-available': 1,
              }
            },
            headers: {
              "apns-priority": "10"
            }
          },
          token: user.fcmToken
        };

        messages.push(message);
      }

      // 3. Send all messages
      if (messages.length > 0) {
        console.log(`Firing ${messages.length} pushes to Firebase...`);
        if (admin.apps.length > 0) {
           const responses = await admin.messaging().sendEach(messages);
           console.log(`[FCM] Sent ${responses.successCount} push notifications successfully. Failed: ${responses.failureCount}`);
           
           if (responses.failureCount > 0) {
             const failedTokens = [];
             responses.responses.forEach((resp, idx) => {
               if (!resp.success) {
                 const errorCode = resp.error?.code;
                 const errorMessage = resp.error?.message;
                 console.error(`[FCM] Token failure for token ${messages[idx].token}: ErrorCode: ${errorCode}, ErrorMessage: ${errorMessage}`);
                 
                 // Token Cleanup Logic
                 if (
                   errorCode === 'messaging/registration-token-not-registered' ||
                   errorCode === 'messaging/invalid-registration-token' ||
                   errorCode === 'messaging/not-found'
                 ) {
                   failedTokens.push(messages[idx].token);
                 }
               }
             });
             
             if (failedTokens.length > 0) {
               console.log(`[FCM] Cleaning up ${failedTokens.length} invalid/unregistered tokens.`);
               await User.updateMany(
                 { fcmToken: { $in: failedTokens } },
                 { $unset: { fcmToken: "" } }
               );
               console.log(`[FCM] Successfully removed ${failedTokens.length} inactive tokens.`);
             }
           }
        } else {
           console.log(`[FCM Mock] (No credentials) Would have sent ${messages.length} High-Priority pushes.`);
        }
      }

      return messages.length;

    } catch (error) {
      console.error("[FCM] Error broadcasting alert:", error);
      throw error;
    }
  }
}

module.exports = new FCMService();
