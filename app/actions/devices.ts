"use server"

import { getDB } from "@/lib/db"
import { Device } from "@/lib/types"
import { getSessionOrganizationId } from "@/lib/session"
import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

export async function getDevices() {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    const devices = await db.collection("devices")
        .find({ organizationId: orgId })
        .sort({ room: 1, placement: 1 })
        .toArray()

    return devices.map(d => ({
        ...d,
        _id: d._id.toString(),
        id: d.id || d._id.toString(),
        room: d.room || d.location || "Unassigned",
        placement: d.placement || "outside",
        lastSeen: d.lastSeen ? new Date(d.lastSeen).toISOString() : null,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null
    })) as any[]
}

export async function getDeviceLogs(limit = 20) {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    // Joint lookup between logs and devices to get friendly names
    const logs = await db.collection("device_logs").aggregate([
        { $sort: { timestamp: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "devices",
                localField: "deviceId",
                foreignField: "deviceId",
                as: "deviceInfo"
            }
        },
        { $unwind: { path: "$deviceInfo", preserveNullAndEmptyArrays: true } }
    ]).toArray()

    return logs.map(l => ({
        id: l._id.toString(),
        _id: l._id.toString(),
        deviceId: l.deviceId,
        deviceName: l.deviceInfo?.name || l.deviceId,
        room: l.deviceInfo?.room || l.deviceInfo?.location || "Unknown",
        type: l.type,
        message: l.message,
        timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : null,
        detail: l.detail
    }))
}

export async function updateDevicePairing(id: string, room: string, placement: "inside" | "outside", classId?: string) {
    const db = await getDB()

    const updateData: any = {
        room,
        placement,
        updatedAt: new Date()
    }

    if (classId) {
        updateData.classId = classId
    }

    let res = await db.collection("devices").updateOne(
        { id },
        { $set: updateData }
    )

    if (res.matchedCount === 0) {
        try {
            await db.collection("devices").updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            )
        } catch (e) { }
    }

    revalidatePath("/dashboard/admin/devices")
    return { success: true }
}

export async function toggleDevicePower(id: string, currentStatus: string) {
    const db = await getDB()
    const newStatus = currentStatus === "online" ? "offline" : "online"

    let res = await db.collection("devices").updateOne(
        { id },
        { $set: { status: newStatus, lastSeen: new Date() } }
    )

    if (res.matchedCount === 0) {
        try {
            await db.collection("devices").updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: newStatus, lastSeen: new Date() } }
            )
        } catch (e) { }
    }

    revalidatePath("/dashboard/admin/devices")
    return { success: true, status: newStatus }
}

export async function registerDevice(data: { deviceId: string, name: string, type: string }) {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    const existing = await db.collection("devices").findOne({ deviceId: data.deviceId })
    if (existing) return { success: false, message: "Device ID already registered" }

    const newDevice: any = {
        ...data,
        id: crypto.randomUUID(),
        room: "Unassigned",
        placement: "outside",
        status: "offline",
        lastSeen: new Date(),
        organizationId: orgId,
        createdAt: new Date()
    }

    await db.collection("devices").insertOne(newDevice)
    revalidatePath("/dashboard/admin/devices")

    // Return a plain object
    return {
        success: true,
        device: {
            ...newDevice,
            _id: newDevice._id.toString(),
            lastSeen: newDevice.lastSeen.toISOString(),
            createdAt: newDevice.createdAt.toISOString()
        }
    }
}

export async function getAvailableRooms() {
    const db = await getDB()
    const orgId = await getSessionOrganizationId()

    // Get unique room numbers from classes collection
    const classes = await db.collection("classes").find({ organizationId: orgId }).toArray()
    const rooms = Array.from(new Set(classes.map(c => c.roomNumber || c.name).filter(Boolean)))

    return ["Unassigned", ...rooms]
}

export async function deleteDevice(id: string) {
    const db = await getDB()
    const { ObjectId } = require("mongodb")

    let res = await db.collection("devices").deleteOne({ id })
    if (res.deletedCount === 0) {
        try {
            await db.collection("devices").deleteOne({ _id: new ObjectId(id) })
        } catch (e) { }
    }

    revalidatePath("/dashboard/admin/devices")
    return { success: true }
}
