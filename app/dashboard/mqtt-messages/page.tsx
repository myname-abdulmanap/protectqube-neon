"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  devicesApi,
  mqttMessagesApi,
  type Device,
  type MqttMessage,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { History, RefreshCw, Search } from "lucide-react";

export default function MqttMessagesPage() {
  const { hasPermission } = useAuth();

  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterDeviceId, setFilterDeviceId] = useState<string>("");
  const [filterTopic, setFilterTopic] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [filterLimit, setFilterLimit] = useState<string>("200");

  const canViewHistory =
    hasPermission("manage_roles") || hasPermission("mqtt_messages:read");

  const deviceNameById = useMemo(
    () => Object.fromEntries(devices.map((item) => [item.id, item.name])),
    [devices],
  );

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [messagesRes, devicesRes] = await Promise.all([
        mqttMessagesApi.getAll({
          deviceId: filterDeviceId || undefined,
          topic: filterTopic.trim() || undefined,
          from: filterFrom ? new Date(filterFrom).toISOString() : undefined,
          to: filterTo ? new Date(filterTo).toISOString() : undefined,
          limit: filterLimit ? Number(filterLimit) : 200,
        }),
        devicesApi.getAll(),
      ]);

      if (messagesRes.success && messagesRes.data) {
        setMessages(messagesRes.data);
      } else {
        setError(messagesRes.error || "Failed to load MQTT messages");
      }

      if (devicesRes.success && devicesRes.data) {
        setDevices(devicesRes.data);
      }
    } catch {
      setError("Failed to load MQTT messages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (!canViewHistory) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No permission</div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h1 className="text-lg font-semibold">MQTT Messages History</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => void load()}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Device</Label>
              <Select
                value={filterDeviceId || "all"}
                onValueChange={(value) =>
                  setFilterDeviceId(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All devices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All devices
                  </SelectItem>
                  {devices.map((device) => (
                    <SelectItem
                      key={device.id}
                      value={device.id}
                      className="text-xs"
                    >
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Topic contains</Label>
              <Input
                value={filterTopic}
                onChange={(event) => setFilterTopic(event.target.value)}
                placeholder="device/+/data"
                className="h-8 w-56 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="datetime-local"
                value={filterFrom}
                onChange={(event) => setFilterFrom(event.target.value)}
                className="h-8 w-44 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="datetime-local"
                value={filterTo}
                onChange={(event) => setFilterTo(event.target.value)}
                className="h-8 w-44 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Limit</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={filterLimit}
                onChange={(event) => setFilterLimit(event.target.value)}
                className="h-8 w-24 text-xs"
              />
            </div>

            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => void load()}
            >
              <Search className="mr-1 h-3 w-3" />
              Query
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Device</TableHead>
                <TableHead className="text-xs">Topic</TableHead>
                <TableHead className="text-xs">QoS</TableHead>
                <TableHead className="text-xs">Retained</TableHead>
                <TableHead className="text-xs">Payload (JSON)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : messages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No MQTT messages found
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(message.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      {message.device?.name ||
                        deviceNameById[message.deviceId] ||
                        message.deviceId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="align-top text-xs font-mono max-w-[260px] break-all">
                      {message.topic}
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      {message.qos}
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      {message.retained ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="align-top text-xs">
                      <pre className="max-h-52 max-w-[560px] overflow-auto rounded bg-muted/40 p-2 font-mono text-[11px] leading-snug whitespace-pre-wrap break-all">
                        {JSON.stringify(message.payload, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
