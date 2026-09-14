import os
import pytest
from pathlib import Path
from backend.app.core.detector import detector
from backend.app.parsers.pcap_parser import pcap_parser
from backend.app.filters.filter_engine import filter_engine
from backend.app.analysis.security_rules import security_engine
from backend.app.analysis.protocols import protocol_analyzer
from backend.app.analysis.ioc_extractor import ioc_extractor
from backend.app.statistics.stats_engine import stats_engine
from backend.scripts.generate_sample_pcap import generate_rich_sample_pcap

SAMPLE_PCAP = Path("captures/test_suite_sample.pcap")

@pytest.fixture(scope="session", autouse=True)
def setup_sample():
    SAMPLE_PCAP.parent.mkdir(parents=True, exist_ok=True)
    generate_rich_sample_pcap(SAMPLE_PCAP)
    yield
    if SAMPLE_PCAP.exists():
        try:
            os.remove(SAMPLE_PCAP)
        except Exception:
            pass

def test_dependency_detector():
    diag = detector.detect_all()
    assert "os" in diag
    assert "dependencies" in diag
    assert diag["dependencies"]["tshark"]["installed"] is True
    assert diag["dependencies"]["npcap"]["installed"] is True

def test_pcap_parsing_summary():
    packets = pcap_parser.parse_summary_stream(str(SAMPLE_PCAP))
    assert len(packets) >= 20
    p1 = packets[0]
    assert p1["packet_no"] == 1
    assert "protocol" in p1
    assert "src_ip" in p1
    assert "dst_ip" in p1

def test_pcap_packet_details():
    detail = pcap_parser.get_packet_details(str(SAMPLE_PCAP), 9)
    assert "layers" in detail
    assert "hex_dump" in detail
    assert "ascii_dump" in detail
    layer_names = [l["name"] for l in detail["layers"]]
    assert "Frame" in layer_names
    assert "Transmission Control Protocol" in layer_names

def test_display_filter():
    valid, err = filter_engine.validate_filter("tcp.port == 80", str(SAMPLE_PCAP))
    assert valid is True
    assert err == ""

    valid_bad, err_bad = filter_engine.validate_filter("invalid syntax???", str(SAMPLE_PCAP))
    assert valid_bad is False
    assert err_bad != ""

    matches = filter_engine.get_matching_packet_numbers(str(SAMPLE_PCAP), "tcp.port == 80")
    assert len(matches) > 0

def test_security_engine():
    packets = pcap_parser.parse_summary_stream(str(SAMPLE_PCAP))
    findings, risk = security_engine.analyze_capture(str(SAMPLE_PCAP), packets)
    assert len(findings) >= 3
    titles = [f["title"] for f in findings]
    assert any("Credential" in t for t in titles)
    assert any("Port Scan" in t for t in titles)
    assert any("DNS Tunneling" in t for t in titles)
    assert risk["score"] >= 50

def test_ioc_extraction():
    packets = pcap_parser.parse_summary_stream(str(SAMPLE_PCAP))
    iocs = ioc_extractor.extract_all(str(SAMPLE_PCAP), packets)
    assert len(iocs) > 0
    types = {i["type"] for i in iocs}
    assert "ip" in types
    assert "domain" in types

def test_statistics_engine():
    packets = pcap_parser.parse_summary_stream(str(SAMPLE_PCAP))
    endpoints = stats_engine.get_endpoints(packets)
    assert len(endpoints) > 0
    conversations = stats_engine.get_conversations(packets)
    assert len(conversations) > 0
    points = stats_engine.get_io_graph_points(packets, buckets=10)
    assert len(points) == 10
